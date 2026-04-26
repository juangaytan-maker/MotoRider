/**
 * 🔥 Firebase Configuration - MotoRider App
 * Proyecto: moto-rider-2
 * Usando SDK Compat para HTML puro
 */

// Configuración de Firebase
const firebaseConfig = {
    apiKey: "AIzaSyCqY81Aks-q4dWJoVIghPdjRiOv2dG24EA",
    authDomain: "moto-rider-2.firebaseapp.com",
    projectId: "moto-rider-2",
    storageBucket: "moto-rider-2.firebasestorage.app",
    messagingSenderId: "938395503462",
    appId: "1:938395503462:web:2d73720def603384f516a7"
};

// Inicializar Firebase
try {
    firebase.initializeApp(firebaseConfig);
    console.log('✅ Firebase inicializado correctamente');
} catch (error) {
    console.error('❌ Error al inicializar Firebase:', error);
}

// Inicializar servicios (usando la versión compat)
const auth = firebase.auth();
const db = firebase.firestore();

console.log(' Servicios de Firebase listos:', { auth: !!auth, db: !!db });

// Verificar sesión al cargar
auth.onAuthStateChanged(async (user) => {
    if (user) {
        console.log('✅ Usuario autenticado:', user.email || user.phoneNumber);
        
        try {
            // Referencia al usuario en Firestore
            const userRef = db.collection('users').doc(user.uid);
            const userDoc = await userRef.get();
            
            if (!userDoc.exists) {
                // Usuario nuevo - obtener ubicación
                console.log('📍 Usuario nuevo, obteniendo ubicación...');
                const location = await getUserLocation();
                
                // Guardar en Firestore
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
                // Actualizar último login
                await userRef.update({
                    lastLogin: firebase.firestore.FieldValue.serverTimestamp()
                });
                console.log('🔄 Último login actualizado');
            }
            
            // Cargar datos locales
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
            
            // Actualizar UI
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

// ✅ OBTENER UBICACIÓN DEL USUARIO
async function getUserLocation() {
    try {
        const response = await fetch('https://ipapi.co/json/');
        const data = await response.json();
        
        return {
            city: data.city || 'Desconocida',
            state: data.region || 'Desconocido',
            country: data.country_name || 'Desconocido',
            countryCode: data.country_code || 'XX',
            latitude: data.latitude || 0,
            longitude: data.longitude || 0,
            timezone: data.timezone || 'UTC'
        };
    } catch (error) {
        console.error('Error obteniendo ubicación:', error);
        return {
            city: 'Desconocida',
            state: 'Desconocido',
            country: 'Desconocido',
            countryCode: 'XX',
            latitude: 0,
            longitude: 0,
            timezone: 'UTC'
        };
    }
}

// ✅ REGISTRO CON EMAIL/PASSWORD
function signUpWithEmail(email, password, name) {
    return auth.createUserWithEmailAndPassword(email, password)
        .then((userCredential) => {
            return userCredential.user.updateProfile({
                displayName: name
            }).then(() => userCredential.user);
        });
}

// ✅ LOGIN CON EMAIL/PASSWORD
function signInWithEmail(email, password) {
    return auth.signInWithEmailAndPassword(email, password);
}

// ✅ LOGIN CON GOOGLE
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

// ✅ LOGIN CON APPLE
function signInWithApple() {
    if (typeof showAlert === 'function') {
        showAlert('🍎 Próximamente', 'Apple Sign-In requiere configuración adicional.');
    }
}

// ✅ LOGOUT
function logout() {
    auth.signOut().then(() => {
        localStorage.removeItem('motoUser');
        location.reload();
    });
}

// ✅ ESTADÍSTICAS DE USUARIOS
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

// Exportar para usar en app.js
window.db = db;
window.getUserLocation = getUserLocation;
window.signUpWithEmail = signUpWithEmail;
window.signInWithEmail = signInWithEmail;
window.getUserStats = getUserStats;