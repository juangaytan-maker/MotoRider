/**
 * 🔥 Firebase Configuration - MotoRider App
 * Proyecto: moto-rider-2
 */

const firebaseConfig = {
    apiKey: "AIzaSyCqY81Aks-q4dWJoVIghPdjRiOv2dG24EA",
    authDomain: "moto-rider-2.firebaseapp.com",
    projectId: "moto-rider-2",
    storageBucket: "moto-rider-2.firebasestorage.app",
    messagingSenderId: "938395503462",
    appId: "1:938395503462:web:2d73720def603384f516a7"
};

try {
    firebase.initializeApp(firebaseConfig);
    console.log('✅ Firebase inicializado correctamente');
} catch (error) {
    console.error('❌ Error al inicializar Firebase:', error);
}

const auth = firebase.auth();
const db = firebase.firestore();

console.log(' Servicios de Firebase listos:', { auth: !!auth, db: !!db });

auth.onAuthStateChanged(async (user) => {
    if (user) {
        console.log('✅ Usuario autenticado:', user.email || user.phoneNumber);
        
        try {
            const userRef = db.collection('users').doc(user.uid);
            const userDoc = await userRef.get();
            
            if (!userDoc.exists) {
                console.log('📍 Usuario nuevo, obteniendo ubicación...');
                const location = await getUserLocation();
                
                await userRef.set({
                    uid: user.uid,
                    email: user.email,
                    phoneNumber: user.phoneNumber,
                    displayName: user.displayName,
                    photoURL: user.photoURL,
                    provider: user.providerData[0]?.providerId || 'firebase',
                    location: location,
                    registeredAt: firebase.firestore.FieldValue.serverTimestamp(),
                    lastLogin: firebase.firestore.FieldValue.serverTimestamp()
                });
                
                console.log('✅ Usuario guardado en Firestore');
            } else {
                await userRef.update({
                    lastLogin: firebase.firestore.FieldValue.serverTimestamp()
                });
                console.log('🔄 Último login actualizado');
            }
            
            const existingUser = JSON.parse(localStorage.getItem('motoUser'));
            const userData = {
                name: user.displayName || 'Motero',
                email: user.email || user.phoneNumber,
                avatarId: existingUser?.avatarId || '1',
                uid: user.uid,
                provider: user.providerData[0]?.providerId || 'firebase',
                bike: existingUser?.bike || null,
                registeredAt: new Date().toISOString()
            };
            
            localStorage.setItem('motoUser', JSON.stringify(userData));
            
            const displayName = document.getElementById('display-name');
            if (displayName) {
                const firstName = user.displayName ? user.displayName.split(' ')[0] : 'Motero';
                displayName.textContent = '¡Hola, ' + firstName + '!';
            }
            
            if (typeof loadUserAvatar === 'function') {
                loadUserAvatar();
                console.log('👤 Avatar cargado');
            }
            
        } catch (error) {
            console.error('❌ Error al sincronizar con Firestore:', error);
        }
    }
});

async function getUserLocation() {
    try {
        // Timeout de 5 segundos para no quedarse trabado
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 5000);
        
        const response = await fetch('https://ipapi.co/json/', {
            signal: controller.signal
        });
        
        clearTimeout(timeoutId);
        
        if (!response.ok) {
            throw new Error('API no responde');
        }
        
        const data = await response.json();
        
        // ✅ VALIDAR QUE EXISTAN LOS VALORES (nunca undefined)
        return {
            city: data.city || 'Ciudad Desconocida',
            state: data.region || 'Estado Desconocido',
            country: data.country_name || 'País Desconocido',
            countryCode: data.country_code || 'XX',
            latitude: typeof data.latitude === 'number' ? data.latitude : 0,
            longitude: typeof data.longitude === 'number' ? data.longitude : 0,
            timezone: data.timezone || 'UTC'
        };
    } catch (error) {
        console.error('❌ Error obteniendo ubicación (usando fallback):', error);
        
        // ✅ VALORES SEGUROS POR DEFECTO (NUNCA undefined)
        return {
            city: 'Ciudad Desconocida',
            state: 'Estado Desconocido',
            country: 'País Desconocido',
            countryCode: 'XX',
            latitude: 8.9824,  // Panamá por defecto
            longitude: -79.5199,
            timezone: 'UTC'
        };
    }
}

function signUpWithEmail(email, password, name) {
    return auth.createUserWithEmailAndPassword(email, password)
        .then((userCredential) => {
            return userCredential.user.updateProfile({
                displayName: name
            }).then(() => userCredential.user);
        });
}

function signInWithEmail(email, password) {
    return auth.signInWithEmailAndPassword(email, password);
}

function signInWithGoogle() {
    const provider = new firebase.auth.GoogleAuthProvider();
    auth.signInWithPopup(provider)
        .then((result) => {
            console.log('✅ Google login exitoso:', result.user);
            if (typeof showSuccess === 'function') {
                showSuccess('¡Bienvenido!', `Hola ${result.user.displayName}, ¡tu ruta empieza ahora!`);
            }
            setTimeout(() => {
                if (typeof navigateTo === 'function') navigateTo('home-screen');
            }, 1000);
        })
        .catch((error) => {
            console.error('❌ Error:', error);
            if (typeof showAlert === 'function') {
                showAlert('Error de acceso', error.message || 'No se pudo iniciar sesión con Google.');
            }
        });
}

function signInWithApple() {
    if (typeof showAlert === 'function') {
        showAlert('🍎 Próximamente', 'Apple Sign-In requiere configuración adicional.');
    }
}

async function getUserStats() {
    try {
        const usersSnapshot = await db.collection('users').get();
        const stats = {
            total: usersSnapshot.size,
            byCountry: {},
            byCity: {},
            byProvider: {}
        };
        
        usersSnapshot.forEach((doc) => {
            const user = doc.data();
            
            const country = user.location?.country || 'Desconocido';
            stats.byCountry[country] = (stats.byCountry[country] || 0) + 1;
            
            const city = user.location?.city || 'Desconocida';
            stats.byCity[city] = (stats.byCity[city] || 0) + 1;
            
            const provider = user.provider || 'desconocido';
            stats.byProvider[provider] = (stats.byProvider[provider] || 0) + 1;
        });
        
        console.log('📊 Estadísticas de Usuarios:', stats);
        return stats;
    } catch (error) {
        console.error('Error obteniendo estadísticas:', error);
        return null;
    }
}

// ✅ Guardar ubicación en tiempo real en Firestore
async function updateUserLocation(lat, lng) {
    const user = auth.currentUser;
    if (!user) return;
    
    try {
        await db.collection('users').doc(user.uid).set({
            uid: user.uid,
            name: user.displayName || 'Motero',
            avatarId: JSON.parse(localStorage.getItem('motoUser'))?.avatarId || '1',
            location: {
                latitude: lat,
                longitude: lng,
                timestamp: firebase.firestore.FieldValue.serverTimestamp()
            },
            lastSeen: firebase.firestore.FieldValue.serverTimestamp(),
            status: 'online'
        }, { merge: true });
        
        console.log('📍 Ubicación actualizada en Firestore');
    } catch (error) {
        console.error('Error actualizando ubicación:', error);
    }
}

// ✅ Escuchar otros usuarios en el mapa
function listenToOtherUsers(mapInstance) {
    const currentUser = auth.currentUser;
    if (!currentUser) return;
    
    const usersRef = db.collection('users')
        .where('status', '==', 'online')
        .orderBy('lastSeen', 'desc');
    
    window.usersUnsubscribe = usersRef.onSnapshot((snapshot) => {
        if (window.otherUserMarkers) {
            window.otherUserMarkers.forEach(marker => mapInstance.removeLayer(marker));
        }
        window.otherUserMarkers = [];
        
        snapshot.forEach((doc) => {
            const userData = doc.data();
            
            if (userData.uid === currentUser.uid) return;
            
            const lastSeen = userData.lastSeen?.toDate();
            const now = new Date();
            const minutesDiff = lastSeen ? (now - lastSeen) / 1000 / 60 : 999;
            
            if (minutesDiff > 5) return;
            
            const { latitude, longitude } = userData.location;
            
            const userIcon = L.icon({
                iconUrl: `avatar/${userData.avatarId || '1'}.png`,
                iconSize: [50, 50],
                iconAnchor: [25, 25],
                popupAnchor: [0, -25]
            });
            
            const marker = L.marker([latitude, longitude], { icon: userIcon })
                .addTo(mapInstance)
                .bindPopup(`
                    <div style="text-align:center; padding:5px;">
                        <strong>${userData.name || 'Motero'}</strong><br>
                        <small style="color:#666;">En línea</small>
                    </div>
                `);
            
            window.otherUserMarkers.push(marker);
        });
        
        console.log(`👥 ${window.otherUserMarkers.length} usuarios en el mapa`);
    });
}

// ✅ Marcar usuario como offline al cerrar
function setUserOffline() {
    const user = auth.currentUser;
    if (!user) return;
    
    db.collection('users').doc(user.uid).update({
        status: 'offline',
        lastSeen: firebase.firestore.FieldValue.serverTimestamp()
    }).catch(err => console.error('Error setting offline:', err));
}

window.db = db;
window.getUserLocation = getUserLocation;
window.signUpWithEmail = signUpWithEmail;
window.signInWithEmail = signInWithEmail;
window.getUserStats = getUserStats;
window.updateUserLocation = updateUserLocation;
window.listenToOtherUsers = listenToOtherUsers;
window.setUserOffline = setUserOffline;
