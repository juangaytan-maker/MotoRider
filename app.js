// ==================== CONFIGURACIÓN GLOBAL ====================
const maintenanceIntervals = {
    'urbana': { oil: 3000, tires: 10000, general: 6000 },
    'scooter': { oil: 2500, tires: 8000, general: 5000 },
    'deportiva': { oil: 4000, tires: 8000, general: 8000 },
    'aventura': { oil: 5000, tires: 12000, general: 10000 },
    'trail': { oil: 6000, tires: 15000, general: 10000 },
    'cross': { oil: 8000, tires: 6000, general: 5000 },
    'crucero': { oil: 4000, tires: 10000, general: 8000 },
    'chopper': { oil: 4000, tires: 10000, general: 8000 },
    'bobber': { oil: 4000, tires: 10000, general: 8000 },
    'proyecto': { oil: 3000, tires: 10000, general: 6000 }
};

const avatarPrices = { 'free': 0, 'standard': 1.99, 'premium': 4.99, 'gold': 9.99 };
const avatarPackPrices = { 'standard': 5.99, 'premium': 14.99, 'gold': 89.99 };

let currentStep = 1;
let selectedAvatar = { tier: 'free', id: '1', price: 0 };
let pendingAvatar = null;
let confirmCallback = null;
let promptCallback = null;
let selectedBikeType = '';
let editingBikeIndex = -1;
let locationUpdateInterval = null;

// ✅ FUNCIÓN SEGURA PARA LEER LOCALSTORAGE
function getStoredUser() {
    try {
        const user = localStorage.getItem('motoUser');
        return user ? JSON.parse(user) : null;
    } catch (e) {
        console.error('❌ Error leyendo localStorage:', e);
        return null;
    }
}

// ==================== MODALES PERSONALIZADOS ====================
function showModal(type, title, message) {
    const modal = document.getElementById('modal-' + type);
    const titleEl = document.getElementById('modal-' + type + '-title');
    const messageEl = document.getElementById('modal-' + type + '-message');
    if (titleEl) titleEl.textContent = title;
    if (messageEl) messageEl.textContent = message;
    if (modal) { modal.classList.add('active'); document.body.style.overflow = 'hidden'; }
}

function closeModal(type) {
    const modal = document.getElementById('modal-' + type);
    if (modal) { modal.classList.remove('active'); document.body.style.overflow = ''; }
    window.scrollTo(0, 0);
}

function showAlert(title, message) { showModal('info', title, message); }
function showSuccess(title, message) { showModal('success', title, message); }
function showWarning(title, message) { showModal('warning', title, message); }
function showConfirm(title, message, callback) { confirmCallback = callback; showModal('confirm', title, message); }

function showPrompt(title, message, defaultValue, callback) {
    promptCallback = callback;
    const input = document.getElementById('modal-prompt-input');
    if (input) { input.value = defaultValue || ''; input.placeholder = defaultValue || ''; }
    showModal('prompt', title, message);
    setTimeout(() => { if (input) input.focus(); }, 300);
}

function confirmAction() { if (confirmCallback) confirmCallback(true); closeModal('confirm'); }
function cancelConfirm() { if (confirmCallback) confirmCallback(false); closeModal('confirm'); }
function submitPrompt() { 
    const input = document.getElementById('modal-prompt-input'); 
    if (promptCallback) promptCallback(input ? input.value.trim() : ''); 
    closeModal('prompt'); 
}

// ==================== NORMAS DE LA COMUNIDAD ====================
function showCommunityRules() { showModal('rules', 'Normas de la Comunidad', ''); }

function validateRulesAcceptance() {
    const checkbox = document.getElementById('terms');
    if (!checkbox || !checkbox.checked) { 
        showAlert('⚠️ Aceptación requerida', 'Debes aceptar las normas de la comunidad para continuar.'); 
        return false; 
    }
    return true;
}

// ==================== AUTENTICACIÓN ====================
function switchAuthTab(tab) {
    const loginForm = document.getElementById('login-form');
    const registerForm = document.getElementById('register-form');
    const tabs = document.querySelectorAll('.tab-btn');
    
    if (tab === 'login') {
        loginForm.style.display = 'flex';
        registerForm.style.display = 'none';
        tabs[0].classList.add('active');
        tabs[1].classList.remove('active');
    } else {
        loginForm.style.display = 'none';
        registerForm.style.display = 'flex';
        tabs[0].classList.remove('active');
        tabs[1].classList.add('active');
    }
}

function handleLogin() {
    const email = document.getElementById('login-email').value.trim();
    const password = document.getElementById('login-pass').value;
    
    if (!email || !password) {
        showAlert('⚠️ Campos requeridos', 'Por favor ingresa email y contraseña.');
        return;
    }
    
    signInWithEmail(email, password)
        .then(() => {
            showSuccess('¡Bienvenido!', 'Has iniciado sesión correctamente.');
            showBannerOnLogin();
        })
        .catch((error) => {
            showAlert('Error de acceso', error.message || 'No se pudo iniciar sesión.');
        });
}

function handleRegister() {
    const name = document.getElementById('reg-name').value.trim();
    const email = document.getElementById('reg-email').value.trim();
    const password = document.getElementById('reg-pass').value;
    
    if (!name || !email || !password) {
        showAlert('⚠️ Campos requeridos', 'Completa todos los campos obligatorios.');
        return;
    }
    
    if (password.length < 6) {
        showAlert('⚠️ Contraseña débil', 'Mínimo 6 caracteres.');
        return;
    }
    
    signUpWithEmail(email, password, name)
        .then((user) => {
            navigateTo('onboarding-screen');
            updateProgress();
            showSuccess('¡Cuenta creada!', 'Configura tu perfil de motero.');
            showBannerOnLogin();
        })
        .catch((error) => {
            let mensaje = 'No se pudo crear la cuenta.';
            if (error.code === 'auth/email-already-in-use') mensaje = 'Email ya registrado.';
            else if (error.code === 'auth/invalid-email') mensaje = 'Email inválido.';
            else if (error.code === 'auth/weak-password') mensaje = 'Contraseña muy débil.';
            showAlert('Error de registro', mensaje);
        });
}

function showResetPassword() {
    const email = prompt('Ingresa tu email:');
    if (email) {
        auth.sendPasswordResetEmail(email)
            .then(() => showAlert('✅ Email enviado', 'Revisa tu correo.'))
            .catch((error) => showAlert('Error', error.message));
    }
}

// ==================== INICIALIZACIÓN ====================
document.addEventListener('DOMContentLoaded', function() {
    console.log('🏍️ MotoRider App iniciada');
    loadUnlockedAvatars();
    loadUserAvatar();
    updateWeather();
    
    const user = getStoredUser();
    if (user) {
        const firstName = user.name ? user.name.split(' ')[0] : 'Motero';
        const displayName = document.getElementById('display-name');
        if (displayName) displayName.textContent = '¡Hola, ' + firstName + '!';
        navigateTo('home-screen');
        updateMaintenanceDisplay();
    } else {
        navigateTo('auth-screen');
    }
    setTimeout(showBanner, 2000);
});

// ==================== CARGAR AVATAR ====================
function loadUserAvatar() {
    const user = getStoredUser();
    const img = document.getElementById('header-avatar-img');
    const icon = document.getElementById('header-default-icon');
    const displayName = document.getElementById('display-name');
    
    if (user) {
        if (user.avatarId && img) { 
            img.src = 'avatar/' + user.avatarId + '.png'; 
            img.style.display = 'block'; 
            if (icon) icon.style.display = 'none'; 
        } else if (icon) { 
            img.style.display = 'none'; 
            icon.style.display = 'block'; 
        }
        if (displayName) { 
            const firstName = user.name ? user.name.split(' ')[0] : 'Motero'; 
            displayName.textContent = '¡Hola, ' + firstName + '!'; 
        }
    }
}

// ==================== NAVEGACIÓN ====================
function navigateTo(screenId) {
    window.scrollTo(0, 0);
    document.querySelectorAll('.screen').forEach(s => s.classList.remove('active'));
    const target = document.getElementById(screenId);
    if (target) target.classList.add('active');
    if (screenId === 'home-screen') updateMaintenanceDisplay();
    if (screenId === 'profile-screen') loadProfileData();
    if (screenId === 'my-bikes-screen') loadMyBikesScreen();
}

// ==================== ONBOARDING ====================
function startOnboarding() {
    const nameInput = document.getElementById('reg-name');
    if (!nameInput || !nameInput.value.trim()) { 
        showAlert('⚠️ Nombre requerido', 'Por favor ingresa tu nombre.'); 
        return; 
    }
    navigateTo('onboarding-screen'); 
    updateProgress();
}

function nextStep(step) {
    if (step === 3) {
        const modelInput = document.getElementById('bike-model');
        if (!modelInput || !modelInput.value.trim()) { 
            showAlert('⚠️ Modelo requerido', 'Ingresa el modelo de tu moto.'); 
            return; 
        }
    }
    const currentEl = document.getElementById('step-' + currentStep);
    if (currentEl) currentEl.classList.remove('active');
    currentStep = step;
    const nextEl = document.getElementById('step-' + currentStep);
    if (nextEl) nextEl.classList.add('active');
    updateProgress();
}

function handleNextStep() { 
    if (!selectedAvatar.id) selectedAvatar = { tier: 'free', id: '1', price: 0 }; 
    
    const user = getStoredUser();
    if (user && user.avatarId) {
        user.avatarId = selectedAvatar.id;
        user.avatar = selectedAvatar;
        localStorage.setItem('motoUser', JSON.stringify(user));
        loadUserAvatar();
        navigateTo('profile-screen');
        showSuccess('¡Avatar Actualizado!', 'Tu nuevo avatar se ha guardado');
    } else {
        nextStep(2);
    }
}

function updateProgress() {
    const fill = document.getElementById('progress-fill');
    if (fill) { 
        if (currentStep === 1) fill.style.width = '33%'; 
        else if (currentStep === 2) fill.style.width = '66%'; 
        else if (currentStep === 3) fill.style.width = '100%'; 
    }
}

function selectBike(element, type) { 
    document.querySelectorAll('.bike-category-card').forEach(el => el.classList.remove('selected')); 
    element.classList.add('selected'); 
}

// ==================== FINALIZAR ONBOARDING ====================
function finishOnboarding() {
    if (!validateRulesAcceptance()) { 
        setTimeout(() => showCommunityRules(), 500); 
        return; 
    }
    
    const nameInput = document.getElementById('reg-name');
    const bikeModelInput = document.getElementById('bike-model');
    const emergencyNameInput = document.getElementById('emergency-name');
    const emergencyPhoneInput = document.getElementById('emergency-phone');
    
    const name = nameInput ? nameInput.value : '';
    const bikeModel = bikeModelInput ? bikeModelInput.value : 'Moto Genérica';
    
    const selectedBikeElement = document.querySelector('.bike-category-card.selected');
    let bikeType = 'default';
    if (selectedBikeElement) {
        const onclickAttr = selectedBikeElement.getAttribute('onclick');
        if (onclickAttr) { 
            const match = onclickAttr.match(/'([^']+)'/); 
            if (match) bikeType = match[1]; 
        }
    }
    
    showPrompt('📊 Kilómetros actuales', '¿Cuántos kilómetros tiene tu ' + bikeModel + ' actualmente?', '0', function(currentKm) {
        if (currentKm === '' || currentKm === null) currentKm = '0';
        const kmValue = parseInt(currentKm) || 0;
        
        const userData = {
            name: name,
            avatarId: selectedAvatar.id, 
            avatar: selectedAvatar,
            bike: { 
                type: bikeType, 
                model: bikeModel, 
                currentKm: kmValue, 
                lastMaintenance: { oil: kmValue, tires: kmValue, general: kmValue } 
            },
            emergency: { 
                name: emergencyNameInput ? emergencyNameInput.value : 'Emergencias', 
                phone: emergencyPhoneInput ? emergencyPhoneInput.value : '911' 
            },
            unlockedAvatars: ['free-1', 'free-2'], 
            acceptedRules: true, 
            registeredAt: new Date().toISOString()
        };
        
        console.log('Usuario registrado:', userData);
        localStorage.setItem('motoUser', JSON.stringify(userData));
        
        const displayName = document.getElementById('display-name');
        if (displayName) { 
            const firstName = name.split(' ')[0]; 
            displayName.textContent = '¡Hola, ' + firstName + '!'; 
        }
        
        navigateTo('home-screen'); 
        updateMaintenanceDisplay(); 
        loadUserAvatar();
        showSuccess('¡Bienvenido!', 'Tu cuenta ha sido creada exitosamente. ¡Buenas rutas!');
    });
}

// ==================== AVATARES ====================
function selectAvatar(element, tier, id) {
    if (element.classList.contains('coming-soon')) { 
        showComingSoon(); 
        return; 
    }
    
    const user = getStoredUser() || {};
    const unlockedAvatars = user.unlockedAvatars || [];
    const avatarKey = tier + '-' + id;
    
    if (tier === 'free' || unlockedAvatars.includes(avatarKey)) { 
        selectAvatarUI(element, tier, id); 
        return; 
    }
    
    pendingAvatar = { tier: tier, id: id, element: element, price: avatarPrices[tier] };
    openPurchaseModal(tier, id);
}

function selectAvatarUI(element, tier, id) {
    document.querySelectorAll('.avatar-option').forEach(el => el.classList.remove('selected'));
    element.classList.add('selected');
    selectedAvatar = { tier: tier, id: id, price: avatarPrices[tier] };
    localStorage.setItem('selectedAvatar', JSON.stringify(selectedAvatar));
}

function showComingSoon() { 
    showNotification('🚧 Próximamente', 'Este avatar estará disponible muy pronto'); 
}

// ==================== MODAL DE COMPRA ====================
function openPurchaseModal(tier, id) {
    const modal = document.getElementById('purchase-modal');
    const tierConfig = { 
        'standard': { name: 'Estándar', color: '#4CAF50' }, 
        'premium': { name: 'Premium', color: '#2196F3' }, 
        'gold': { name: 'GOLD', color: '#FFD700' } 
    };
    
    document.getElementById('modal-avatar-img').src = 'avatar/' + id + '.png';
    document.getElementById('modal-title').textContent = 'Avatar ' + id;
    
    const badge = document.getElementById('modal-avatar-tier');
    badge.textContent = tier.toUpperCase();
    badge.style.background = tierConfig[tier].color;
    badge.style.color = tier === 'gold' ? '#000' : '#fff';

    document.getElementById('modal-pack-price').textContent = '$' + avatarPackPrices[tier].toFixed(2);
    
    modal.style.display = 'flex'; 
    modal.classList.add('active');
}

function closePurchaseModal() {
    const modal = document.getElementById('purchase-modal');
    if (modal) {
        modal.classList.remove('active');
        modal.style.display = 'none';
    }
    pendingAvatar = null;
}

function completePurchase(type) {
    if (!pendingAvatar) return;

    const user = getStoredUser() || {};
    if (!user.unlockedAvatars) user.unlockedAvatars = ['free-1', 'free-2'];

    if (type === 'single') {
        const avatarKey = pendingAvatar.tier + '-' + pendingAvatar.id;
        if (!user.unlockedAvatars.includes(avatarKey)) {
            user.unlockedAvatars.push(avatarKey);
            unlockAvatarUI(pendingAvatar.element, pendingAvatar.tier, pendingAvatar.id);
        }
    } else if (type === 'pack') {
        const tier = pendingAvatar.tier;
        getAvatarsByTier(tier).forEach(function(avatarId) {
            const avatarKey = tier + '-' + avatarId;
            if (!user.unlockedAvatars.includes(avatarKey)) {
                user.unlockedAvatars.push(avatarKey);
                document.querySelectorAll('.avatar-option.' + tier).forEach(function(el) {
                    const onclickAttr = el.getAttribute('onclick');
                    if (onclickAttr && onclickAttr.includes("'" + avatarId + "'")) {
                        unlockAvatarUI(el, tier, avatarId);
                    }
                });
            }
        });
    }

    localStorage.setItem('motoUser', JSON.stringify(user));
    showNotification('🎉 ¡Avatar Desbloqueado!', 'Tu nuevo avatar está listo');
    closePurchaseModal();
}

function unlockAvatarUI(element, tier, id) {
    element.classList.add('unlocked'); 
    element.classList.remove('locked');
    const lockOverlay = element.querySelector('.lock-overlay'); 
    if (lockOverlay) lockOverlay.style.display = 'none';
    const priceBadge = element.querySelector('.price-badge'); 
    if (priceBadge) { 
        priceBadge.innerHTML = '✓'; 
        priceBadge.style.background = 'linear-gradient(135deg, #4CAF50, #45a049)'; 
    }
}

function getAvatarsByTier(tier) { 
    const tiers = { 
        'free': ['1','2'], 
        'standard': ['3','4','5','6'], 
        'premium': ['7','8','9','10'], 
        'gold': ['11','12','13','14','15','16','17','18','19','20','21','22'] 
    }; 
    return tiers[tier] || []; 
}

function loadUnlockedAvatars() {
    const user = getStoredUser() || {};
    (user.unlockedAvatars || []).forEach(function(avatarKey) {
        const parts = avatarKey.split('-'); 
        const tier = parts[0], id = parts[1];
        document.querySelectorAll('.avatar-option.' + tier).forEach(function(el) {
            const onclickAttr = el.getAttribute('onclick');
            if (onclickAttr && onclickAttr.includes("'" + id + "'")) unlockAvatarUI(el, tier, id);
        });
    });
}

document.addEventListener('click', function(e) { 
    const modal = document.getElementById('purchase-modal'); 
    if (e.target === modal) closePurchaseModal(); 
});

// ==================== MANTENIMIENTO ====================
function getNextMaintenance() {
    const user = getStoredUser();
    if (!user || !user.bike || !user.bike.type) return null;
    
    const intervals = maintenanceIntervals[user.bike.type] || maintenanceIntervals['default'];
    const currentKm = user.bike.currentKm || 0;
    const lastMaintenance = user.bike.lastMaintenance || { oil: 0, tires: 0, general: 0 };
    
    const maintenances = [
        { type: 'Cambio de aceite', km: intervals.oil - (currentKm - lastMaintenance.oil) },
        { type: 'Revisión de llantas', km: intervals.tires - (currentKm - lastMaintenance.tires) },
        { type: 'Mantenimiento general', km: intervals.general - (currentKm - lastMaintenance.general) }
    ];
    
    const upcoming = maintenances.filter(m => m.km > 0).sort((a, b) => a.km - b.km);
    return upcoming[0] || maintenances[0];
}

function updateMaintenanceDisplay() {
    const nextMaint = getNextMaintenance();
    const info = document.getElementById('maintenance-info');
    if (!info) return;
    
    if (!nextMaint) { 
        info.innerHTML = '<span style="color:var(--text-secondary)">Sin datos de moto</span>'; 
        return; 
    }
    
    const color = nextMaint.km < 500 ? '#F44336' : '#FF6B35';
    info.innerHTML = '<span style="color:' + color + '">' + nextMaint.km + ' km</span>';
}

function addKilometers() {
    const user = getStoredUser();
    if (!user || !user.bike) { 
        showAlert('⚠️ Sin registro', 'No hay usuario registrado.'); 
        return; 
    }
    
    showPrompt('📈 Agregar kilómetros', 'Kilómetros actuales: ' + user.bike.currentKm + '\n\n¿Cuántos kilómetros recorriste?', '0', function(kmToAdd) {
        if (kmToAdd === '' || kmToAdd === null) return;
        if (!isNaN(kmToAdd)) {
            const km = parseInt(kmToAdd); 
            user.bike.currentKm += km;
            localStorage.setItem('motoUser', JSON.stringify(user)); 
            updateMaintenanceDisplay();
            showSuccess('✅ Actualizado', 'Has agregado ' + km + ' km.\nTotal: ' + user.bike.currentKm + ' km');
        } else { 
            showAlert('⚠️ Valor inválido', 'Por favor ingresa un número válido.'); 
        }
    });
}

// ==================== CLIMA EN TIEMPO REAL ====================
function updateWeather() {
    const tempEl = document.getElementById('weather-temp');
    const iconEl = document.getElementById('weather-icon');
    
    if (!navigator.geolocation) { 
        if (tempEl) tempEl.textContent = "N/A"; 
        return; 
    }
    
    navigator.geolocation.getCurrentPosition((pos) => {
        const lat = pos.coords.latitude, lon = pos.coords.longitude;
        fetch(`https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lon}&current_weather=true`)
            .then(r => r.json())
            .then(data => {
                const temp = Math.round(data.current_weather.temperature);
                tempEl.textContent = temp + '°C';
                
                const code = data.current_weather.weathercode;
                let icon = 'fas fa-cloud';
                if (code === 0) icon = 'fas fa-sun';
                else if (code >= 1 && code <= 3) icon = 'fas fa-cloud-sun';
                else if (code >= 45 && code <= 48) icon = 'fas fa-smog';
                else if (code >= 51 && code <= 67) icon = 'fas fa-cloud-rain';
                else if (code >= 71 && code <= 77) icon = 'fas fa-snowflake';
                else if (code >= 80 && code <= 82) icon = 'fas fa-cloud-showers-heavy';
                else if (code >= 95) icon = 'fas fa-bolt';
                
                iconEl.className = icon;
            })
            .catch(() => { 
                if (tempEl) tempEl.textContent = "--°C"; 
            });
    }, () => { 
        if (tempEl) tempEl.textContent = "22°C"; 
        if (iconEl) iconEl.className = "fas fa-sun"; 
    });
}

// ==================== NOTIFICACIONES TOAST ====================
function showNotification(title, message) {
    const existing = document.querySelector('.app-notification'); 
    if (existing) existing.remove();
    
    const notification = document.createElement('div');
    notification.className = 'app-notification';
    notification.innerHTML = '<strong>' + title + '</strong><p>' + message + '</p>';
    notification.style.cssText = 'position:fixed;top:20px;left:50%;transform:translateX(-50%);background:#16213E;color:white;padding:15px 25px;border-radius:10px;box-shadow:0 4px 20px rgba(0,0,0,0.3);z-index:10000;border-left:4px solid #FF6B35;animation:slideIn 0.3s ease;min-width:250px;text-align:center;';
    
    document.body.appendChild(notification);
    
    if (!document.getElementById('notification-styles')) {
        const style = document.createElement('style'); 
        style.id = 'notification-styles';
        style.textContent = '@keyframes slideIn{from{transform:translate(-50%,-100%);opacity:0}to{transform:translate(-50%,0);opacity:1}}@keyframes slideOut{from{transform:translate(-50%,0);opacity:1}to{transform:translate(-50%,-100%);opacity:0}}';
        document.head.appendChild(style);
    }
    
    setTimeout(() => { 
        notification.style.animation = 'slideOut 0.3s ease'; 
        setTimeout(() => notification.remove(), 300); 
    }, 3000);
}

// ==================== PERFIL ====================
function openAvatarSelector() {
    navigateTo('onboarding-screen');
    currentStep = 1;
    
    document.querySelectorAll('.step-container').forEach(el => el.classList.remove('active'));
    document.getElementById('step-1').classList.add('active');
    
    updateProgress();
    
    const user = getStoredUser();
    if (user && user.avatarId) {
        document.querySelectorAll('.avatar-option').forEach(el => {
            const onclickAttr = el.getAttribute('onclick');
            if (onclickAttr && onclickAttr.includes("'" + user.avatarId + "'")) {
                el.classList.add('selected');
            }
        });
    }
    
    showAlert('Selecciona tu nuevo avatar', 'Toca un avatar y luego presiona "Continuar"');
    showBannerOnAvatar();
}

function loadProfileData() {
    const user = getStoredUser();
    if (!user) return;
    
    const profileName = document.getElementById('profile-name');
    const profileEmail = document.getElementById('profile-email');
    
    if (profileName) {
        const firstName = user.name ? user.name.split(' ')[0] : 'Motero';
        profileName.textContent = '¡Hola, ' + firstName + '!';
    }
    if (profileEmail) profileEmail.textContent = user.email || 'Sin email';
    
    const avatarImg = document.getElementById('profile-avatar-img');
    if (avatarImg && user.avatarId) {
        avatarImg.src = 'avatar/' + user.avatarId + '.png';
    }
    
    if (user.bike) {
        const bikeTypes = {
            'urbana': 'Urbana', 'scooter': 'Scooter', 'deportiva': 'Deportiva',
            'aventura': 'Aventura', 'trail': 'Trail', 'cross': 'Cross/Enduro',
            'crucero': 'Crucero', 'chopper': 'Chopper', 'bobber': 'Bobber', 'proyecto': 'Proyecto'
        };
        
        const bikeTypeEl = document.getElementById('profile-bike-type');
        const bikeModelEl = document.getElementById('profile-bike-model');
        const bikeKmEl = document.getElementById('profile-km');
        
        if (bikeTypeEl) bikeTypeEl.textContent = bikeTypes[user.bike.type] || user.bike.type;
        if (bikeModelEl) bikeModelEl.textContent = user.bike.model || '-';
        if (bikeKmEl) bikeKmEl.textContent = (user.bike.currentKm || 0).toLocaleString() + ' km';
    }
}

// ==================== GESTIÓN DE MOTOS ====================
function getUserBikes() {
    const user = getStoredUser();
    if (!user) return [];
    
    if (Array.isArray(user.bikes)) {
        return user.bikes;
    } else if (user.bike) {
        return [{
            type: user.bike.type,
            model: user.bike.model,
            currentKm: user.bike.currentKm,
            lastMaintenance: user.bike.lastMaintenance,
            active: true
        }];
    }
    return [];
}

function saveUserBikes(bikes) {
    const user = getStoredUser();
    if (!user) return;
    
    user.bikes = bikes;
    const activeBike = bikes.find(b => b.active) || bikes[0];
    if (activeBike) {
        user.bike = activeBike;
    }
    
    localStorage.setItem('motoUser', JSON.stringify(user));
}

function getBikeIcon(type) {
    const icons = {
        'urbana': 'fas fa-city',
        'scooter': 'fas fa-motorcycle',
        'deportiva': 'fas fa-tachometer-alt',
        'aventura': 'fas fa-globe-americas',
        'trail': 'fas fa-mountain',
        'cross': 'fas fa-flag-checkered',
        'crucero': 'fas fa-road',
        'chopper': 'fas fa-motorcycle',
        'bobber': 'fas fa-motorcycle',
        'proyecto': 'fas fa-tools'
    };
    return icons[type] || 'fas fa-motorcycle';
}

function getBikeTypeName(type) {
    const names = {
        'urbana': 'Urbana',
        'scooter': 'Scooter',
        'deportiva': 'Deportiva',
        'aventura': 'Aventura',
        'trail': 'Trail',
        'cross': 'Cross',
        'crucero': 'Crucero',
        'chopper': 'Chopper',
        'bobber': 'Bobber',
        'proyecto': 'Proyecto'
    };
    return names[type] || type;
}

function loadMyBikesScreen() {
    const bikes = getUserBikes();
    const container = document.getElementById('bikes-list');
    
    if (!container) return;
    
    if (bikes.length === 0) {
        container.innerHTML = `
            <div class="empty-bikes">
                <i class="fas fa-motorcycle"></i>
                <p>No tienes motos registradas</p>
                <p style="font-size:12px;margin-top:5px;">Agrega tu primera moto</p>
            </div>
        `;
        return;
    }
    
    container.innerHTML = bikes.map((bike, index) => `
        <div class="bike-card ${bike.active ? 'active-bike' : ''}" onclick="setActiveBike(${index})">
            <div class="bike-card-icon">
                <i class="${getBikeIcon(bike.type)}"></i>
            </div>
            <div class="bike-card-info">
                <div class="bike-card-name">${bike.model || 'Moto sin nombre'} ${bike.active ? '<span style="color:var(--primary);font-size:11px;">● Activa</span>' : ''}</div>
                <div class="bike-card-details">${getBikeTypeName(bike.type)} • ${(bike.currentKm || 0).toLocaleString()} km</div>
            </div>
            <div class="bike-card-actions">
                <button class="bike-card-btn" onclick="event.stopPropagation(); editBike(${index})">
                    <i class="fas fa-pen"></i>
                </button>
                <button class="bike-card-btn delete" onclick="event.stopPropagation(); deleteBike(${index})">
                    <i class="fas fa-trash"></i>
                </button>
            </div>
        </div>
    `).join('');
}

function showAddBikeModal() {
    editingBikeIndex = -1;
    selectedBikeType = '';
    document.getElementById('bike-modal-title').textContent = 'Agregar Moto';
    document.getElementById('bike-modal-model').value = '';
    document.getElementById('bike-modal-km').value = '';
    document.getElementById('bike-modal-edit-index').value = '-1';
    document.getElementById('bike-modal-selected-type').value = '';
    
    document.querySelectorAll('.bike-type-option').forEach(el => el.classList.remove('selected'));
    
    document.getElementById('bike-modal').classList.add('active');
    document.body.style.overflow = 'hidden';
}

function editBike(index) {
    const bikes = getUserBikes();
    if (index >= bikes.length) return;
    
    const bike = bikes[index];
    editingBikeIndex = index;
    selectedBikeType = bike.type;
    
    document.getElementById('bike-modal-title').textContent = 'Editar Moto';
    document.getElementById('bike-modal-model').value = bike.model || '';
    document.getElementById('bike-modal-km').value = bike.currentKm || 0;
    document.getElementById('bike-modal-edit-index').value = index;
    document.getElementById('bike-modal-selected-type').value = bike.type;
    
    document.querySelectorAll('.bike-type-option').forEach(el => {
        el.classList.toggle('selected', el.dataset.type === bike.type);
    });
    
    document.getElementById('bike-modal').classList.add('active');
    document.body.style.overflow = 'hidden';
}

function closeBikeModal() {
    document.getElementById('bike-modal').classList.remove('active');
    document.body.style.overflow = '';
    editingBikeIndex = -1;
    selectedBikeType = '';
    window.scrollTo(0, 0);
}

function selectBikeType(type) {
    selectedBikeType = type;
    document.getElementById('bike-modal-selected-type').value = type;
    
    document.querySelectorAll('.bike-type-option').forEach(el => {
        el.classList.toggle('selected', el.dataset.type === type);
    });
}

function saveBike() {
    const model = document.getElementById('bike-modal-model').value.trim();
    const km = parseInt(document.getElementById('bike-modal-km').value) || 0;
    const type = selectedBikeType || document.getElementById('bike-modal-selected-type').value;
    
    if (!type) {
        showAlert('⚠️ Tipo requerido', 'Selecciona el tipo de moto.');
        return;
    }
    
    if (!model) {
        showAlert('⚠️ Modelo requerido', 'Ingresa el modelo de tu moto.');
        return;
    }
    
    const bikes = getUserBikes();
    const isEditing = editingBikeIndex >= 0;
    
    const bikeData = {
        type: type,
        model: model,
        currentKm: km,
        lastMaintenance: { oil: km, tires: km, general: km }
    };
    
    if (isEditing) {
        bikeData.active = bikes[editingBikeIndex].active;
        bikes[editingBikeIndex] = bikeData;
    } else {
        if (bikes.length === 0) {
            bikeData.active = true;
        }
        bikes.push(bikeData);
    }
    
    saveUserBikes(bikes);
    closeBikeModal();
    loadMyBikesScreen();
    loadProfileData();
    updateMaintenanceDisplay();
    
    showSuccess(
        isEditing ? '¡Moto actualizada!' : '¡Moto agregada!', 
        isEditing ? 'Los datos se guardaron correctamente.' : 'Tu nueva moto ha sido registrada.'
    );
}

function deleteBike(index) {
    const bikes = getUserBikes();
    if (bikes.length <= 1) {
        showAlert('⚠️ No se puede eliminar', 'Debes tener al menos una moto registrada.');
        return;
    }
    
    const bike = bikes[index];
    showConfirm(
        '¿Eliminar moto?',
        `¿Estás seguro de eliminar "${bike.model || 'esta moto'}"?`,
        function(confirmed) {
            if (confirmed) {
                const wasActive = bike.active;
                bikes.splice(index, 1);
                
                if (wasActive && bikes.length > 0) {
                    bikes[0].active = true;
                }
                
                saveUserBikes(bikes);
                loadMyBikesScreen();
                loadProfileData();
                updateMaintenanceDisplay();
                showNotification('🗑️ Moto eliminada', 'Se eliminó correctamente.');
            }
        }
    );
}

function setActiveBike(index) {
    const bikes = getUserBikes();
    
    bikes.forEach(b => b.active = false);
    bikes[index].active = true;
    
    saveUserBikes(bikes);
    loadMyBikesScreen();
    loadProfileData();
    updateMaintenanceDisplay();
    
    showNotification('🏍️ Moto activa', `Ahora usas: ${bikes[index].model}`);
}

// ==================== BANNER DE ANUNCIOS ====================
function showBanner() {
    const banner = document.getElementById('app-banner');
    const nav = document.querySelector('.bottom-nav');
    
    if (banner) banner.classList.add('show');
    if (nav) nav.classList.remove('no-banner');
}

function closeBanner() {
    const banner = document.getElementById('app-banner');
    const nav = document.querySelector('.bottom-nav');
    
    if (banner) banner.classList.remove('show');
    if (nav) nav.classList.add('no-banner');
}

function showBannerOnLogin() {
    setTimeout(() => {
        showBanner();
    }, 500);
}

function showBannerOnAvatar() {
    setTimeout(() => {
        showBanner();
    }, 300);
}

// ==================== MAPA INTERACTIVO ====================
let map = null;
let userMarker = null;
let currentRoute = null;
let routeLayer = null;

const routes = {
    urbana: {
        name: "Ruta Urbana",
        desc: "15 km • 45 min • Dificultad: Fácil",
        color: "#FF6B35",
        path: [
            [8.9824, -79.5199],
            [8.9850, -79.5150],
            [8.9900, -79.5100],
            [8.9950, -79.5050],
            [9.0000, -79.5000]
        ]
    },
    aventura: {
        name: "Ruta de Montaña",
        desc: "45 km • 2.5 hrs • Dificultad: Media",
        color: "#4CAF50",
        path: [
            [8.9824, -79.5199],
            [9.0100, -79.5300],
            [9.0300, -79.5500],
            [9.0500, -79.5700]
        ]
    },
    costera: {
        name: "Ruta Costera",
        desc: "30 km • 1.5 hrs • Dificultad: Fácil",
        color: "#2196F3",
        path: [
            [8.9824, -79.5199],
            [8.9700, -79.5100],
            [8.9600, -79.5000],
            [8.9500, -79.4900]
        ]
    }
};

function initMap() {
    if (typeof L === 'undefined') {
        console.warn('⚠️ Leaflet no está cargado aún. Reintentando...');
        setTimeout(() => initMap(), 500);
        return;
    }
    
    if (map) return;
    
    const defaultPos = [8.9824, -79.5199];
    
    map = L.map('leaflet-map', {
        zoomControl: false,
        attributionControl: false
    }).setView(defaultPos, 13);
    
    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        maxZoom: 19
    }).addTo(map);
    
    L.control.zoom({
        position: 'bottomright'
    }).addTo(map);
    
    // ✅ Inicializar array de marcadores
    window.otherUserMarkers = [];
    
    // ✅ Escuchar otros usuarios en tiempo real
    if (auth.currentUser) {
        listenToOtherUsers(map);
    }
    
    getUserLocation();
    showRoute('urbana');
}

function getUserLocation() {
    if (navigator.geolocation) {
        navigator.geolocation.getCurrentPosition(
            (position) => {
                const lat = position.coords.latitude;
                const lng = position.coords.longitude;
                
                if (map) {
                    map.setView([lat, lng], 16);
                } else {
                    console.warn('⚠️ El mapa aún no está inicializado');
                    return;
                }
                
                // ✅ Actualizar ubicación en Firestore
                if (auth.currentUser) {
                    updateUserLocation(lat, lng);
                    
                    // Actualizar cada 10 segundos
                    if (locationUpdateInterval) clearInterval(locationUpdateInterval);
                    locationUpdateInterval = setInterval(() => {
                        navigator.geolocation.getCurrentPosition((pos) => {
                            updateUserLocation(pos.coords.latitude, pos.coords.longitude);
                        });
                    }, 10000);
                }
                
                const user = getStoredUser();
                let avatarUrl = 'avatar/1.png';
                if (user && user.avatarId) {
                    avatarUrl = 'avatar/' + user.avatarId + '.png';
                }
                
                const customIcon = L.icon({
                    iconUrl: avatarUrl,
                    iconSize: [60, 60],
                    iconAnchor: [30, 30],
                    popupAnchor: [0, -25],
                    className: 'user-avatar-marker'
                });
                
                if (userMarker) {
                    map.removeLayer(userMarker);
                }
                
                userMarker = L.marker([lat, lng], { icon: customIcon }).addTo(map);
                
                L.circle([lat, lng], {
                    radius: position.coords.accuracy,
                    color: '#FF6B35',
                    fillColor: '#FF6B35',
                    fillOpacity: 0.05,
                    weight: 1
                }).addTo(map);
            },
            (error) => {
                console.warn('Error obteniendo ubicación:', error);
                if (map) {
                    map.setView([8.9824, -79.5199], 13);
                }
            }
        );
    }
}

function centerOnUser() {
    if (userMarker) {
        const pos = userMarker.getLatLng();
        map.setView([pos.lat, pos.lng], 16);
    } else {
        getUserLocation();
    }
}

function showRoute(routeType, event) {
    if (!map) initMap();
    
    const route = routes[routeType];
    if (!route) return;
    
    if (event && event.target) {
        document.querySelectorAll('.route-btn').forEach(btn => {
            btn.classList.remove('active');
        });
        event.target.closest('.route-btn').classList.add('active');
    } else {
        document.querySelectorAll('.route-btn').forEach(btn => {
            btn.classList.remove('active');
            if (btn.textContent.toLowerCase().includes(routeType)) {
                btn.classList.add('active');
            }
        });
    }
    
    if (routeLayer) {
        map.removeLayer(routeLayer);
    }
    
    routeLayer = L.polyline(route.path, {
        color: route.color,
        weight: 5,
        opacity: 0.8,
        dashArray: '10, 10',
        lineCap: 'round'
    }).addTo(map);
    
    map.fitBounds(routeLayer.getBounds(), { padding: [50, 50] });
    
    L.marker(route.path[0], {
        icon: L.divIcon({
            className: 'route-marker',
            html: '<div style="background:#4CAF50;width:16px;height:16px;border-radius:50%;border:3px solid white;"></div>',
            iconSize: [16, 16]
        })
    }).addTo(map).bindPopup("Inicio");
    
    L.marker(route.path[route.path.length - 1], {
        icon: L.divIcon({
            className: 'route-marker',
            html: '<div style="background:#F44336;width:16px;height:16px;border-radius:50%;border:3px solid white;"></div>',
            iconSize: [16, 16]
        })
    }).addTo(map).bindPopup("Destino");
    
    document.getElementById('route-name').textContent = route.name;
    document.getElementById('route-desc').textContent = route.desc;
    
    currentRoute = route;
}

function startRoute() {
    if (!currentRoute) return;
    
    showNotification('🏍️ ¡Ruta Iniciada!', `Navegando: ${currentRoute.name}`);
    
    setTimeout(() => {
        showSuccess('¡Buenas rutas!', 'Que disfrutes el recorrido');
    }, 1000);
}

const originalNavigateToMap = navigateTo;
navigateTo = function(screenId) {
    originalNavigateToMap(screenId);
    if (screenId === 'map-screen') {
        setTimeout(() => {
            initMap();
            if (map) {
                setTimeout(() => map.invalidateSize(), 300);
            }
        }, 100);
    }
};

// ==================== LOGOUT ====================
function logout() {
    setUserOffline();
    
    if (locationUpdateInterval) {
        clearInterval(locationUpdateInterval);
    }
    
    if (window.usersUnsubscribe) {
        window.usersUnsubscribe();
    }
    
    localStorage.removeItem('motoUser');
    if (auth) {
        auth.signOut().then(() => {
            navigateTo('auth-screen');
            showSuccess('Sesión cerrada', '¡Hasta pronto!');
        });
    }
}

// Limpiar al cerrar página/app
window.addEventListener('beforeunload', () => {
    setUserOffline();
    
    if (locationUpdateInterval) {
        clearInterval(locationUpdateInterval);
    }
    
    if (window.usersUnsubscribe) {
        window.usersUnsubscribe();
    }
});
