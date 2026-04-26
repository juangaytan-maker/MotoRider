window.userMarkers = {}; // ✅ Diccionario para guardar marcadores por UID

function listenToOtherUsers(mapInstance) {
    const currentUser = auth.currentUser;
    if (!currentUser) return;
    
    const usersRef = db.collection('users')
        .where('status', '==', 'online')
        .orderBy('lastSeen', 'desc');
    
    window.usersUnsubscribe = usersRef.onSnapshot((snapshot) => {
        const now = new Date();
        const activeUids = new Set();
        
        snapshot.forEach((doc) => {
            const userData = doc.data();
            if (userData.uid === currentUser.uid) return;
            
            // ✅ FIX: Filtro estricto de 3 minutos (los desconectados desaparecen rápido)
            const lastSeen = userData.lastSeen?.toDate();
            const minutesDiff = lastSeen ? (now - lastSeen) / 60000 : 999;
            if (minutesDiff > 3) return;
            
            activeUids.add(userData.uid);
            const { latitude, longitude } = userData.location;
            if (!latitude) return;

            const userIcon = L.icon({
                iconUrl: `avatar/${userData.avatarId || '1'}.png`,
                iconSize: [45, 45], iconAnchor: [22, 22]
            });
            
            const popupContent = `
                <div class="user-interaction-popup">
                    <h4>${userData.name || 'Motero'}</h4>
                    <p>🏍️ ${userData.kmh || 0} km/h</p>
                    <div class="interaction-buttons">
                        <button class="btn-interact btn-greet" onclick="sendGreeting('${userData.uid}', '${userData.name}')">👋 Saludar</button>
                        <button class="btn-interact btn-msg" onclick="sendMessage('${userData.uid}', '${userData.name}')">💬 Mensaje</button>
                    </div>
                </div>
            `;

            // ✅ FIX: Si ya existe, SOLO actualizamos posición (evita parpadeo)
            if (window.userMarkers[userData.uid]) {
                window.userMarkers[userData.uid].setLatLng([latitude, longitude]);
                window.userMarkers[userData.uid].setPopupContent(popupContent);
            } else {
                // Si es nuevo, lo creamos
                const marker = L.marker([latitude, longitude], { icon: userIcon })
                    .addTo(mapInstance)
                    .bindPopup(popupContent);
                window.userMarkers[userData.uid] = marker;
            }
        });
        
        // ✅ FIX: Eliminamos SOLO los marcadores de usuarios que se desconectaron
        Object.keys(window.userMarkers).forEach(uid => {
            if (!activeUids.has(uid)) {
                mapInstance.removeLayer(window.userMarkers[uid]);
                delete window.userMarkers[uid];
            }
        });
    });
}
