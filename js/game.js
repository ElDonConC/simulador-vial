// ============================================================
// SIMULADOR VIAL - ONG EDUCLETA (MOTOR PRINCIPAL DE JUEGO)
// ============================================================

// Variables de Estado
let gameState = 'menu'; // menu, playing, crashing, gameover
let currentMode = 'normal'; // normal, drunk, distracted
let score = 0;
let speedMultiplier = 0.6;
let cameraMode = 'fpv'; // 'fpv' (1ra persona) | 'tpv' (3ra persona)

// Elementos UI
const elMainMenu = document.getElementById('main-menu');
const elGameOver = document.getElementById('game-over');
const elHud = document.getElementById('hud');
const elStatus = document.getElementById('hud-status');
const elStatusDot = document.getElementById('hud-status-dot');
const elScore = document.getElementById('hud-score');
const elSpeed = document.getElementById('hud-speed');
const elRpmBar = document.getElementById('rpm-bar');
const elMessage = document.getElementById('game-over-message');
const elStats = document.getElementById('game-over-stats');
const elCanvas = document.getElementById('game-canvas');
const elDistraction = document.getElementById('phone-distraction');
const elCamToggle = document.getElementById('cam-toggle');
const elCamLabel = document.getElementById('cam-label');
const elBtnBackMenu = document.getElementById('btn-back-menu');
const elBrakeIndicator = document.getElementById('hud-brake-indicator');
const tLeft = document.getElementById('touch-left');
const tRight = document.getElementById('touch-right');
const elQuestModal = document.getElementById('quest-modal');

// Configuración Escena Three.js
const scene = new THREE.Scene();
scene.fog = new THREE.Fog(0x0f172a, 80, 260);

const camera = new THREE.PerspectiveCamera(70, window.innerWidth / window.innerHeight, 0.1, 350);
const renderer = new THREE.WebGLRenderer({ 
    canvas: elCanvas, 
    antialias: true,
    powerPreference: 'high-performance',
    precision: 'mediump'
});
renderer.setSize(window.innerWidth, window.innerHeight);
renderer.setPixelRatio(Math.min(window.devicePixelRatio, 1.5));
renderer.setClearColor(0x0f172a);
renderer.shadowMap.enabled = false;

// WebXR para Meta Quest 2 / 3 / Pro y Rig de Cámara VR
renderer.xr.enabled = true;
let isVRActive = false;
let vrSession = null;

// Inicializar Vehículo del Jugador
const playerVehicle = createPlayerVehicle();
const player = playerVehicle.mesh;
const cabin = playerVehicle.cabin;
const roof = playerVehicle.roof;
const wheelGroup = playerVehicle.wheelGroup;
const playerWheels = playerVehicle.playerWheels;
const tailMat = playerVehicle.tailMat;
scene.add(player);

// Posición inicial de cámara en el menú (para navegador 2D)
camera.position.set(0, 2.5, 7.0);
camera.lookAt(0, 1.0, -10);

// Menú 3D Flotante de inicio / selección de modo en VR
const vrMenuPanel = createVRMenuPanel();
vrMenuPanel.position.set(0, 1.25, -1.5);
vrMenuPanel.visible = false;
scene.add(vrMenuPanel);

// Rig de Cámara para Realidad Virtual (Anclado directamente como HIJO del auto en el asiento del piloto)
const xrCameraRig = new THREE.Group();
xrCameraRig.position.set(-0.48, 0.96, 0.15); // Ubicado a la altura real de los ojos del conductor sobre el asiento
xrCameraRig.add(camera);
player.add(xrCameraRig); // ¡Al ser hijo de player, se mueve y gira automáticamente con el auto de forma 100% fija!

function recenterVRCockpit() {
    // Restablecer posición y rotación fija dentro del asiento
    xrCameraRig.position.set(-0.48, 0.96, 0.15);
    xrCameraRig.rotation.set(0, 0, 0);
}

// Controladores Touch y Rayos Láser Visibles (Manos en VR)
const controller1 = renderer.xr.getController(0);
const controller2 = renderer.xr.getController(1);
const controllerGrip1 = renderer.xr.getControllerGrip(0);
const controllerGrip2 = renderer.xr.getControllerGrip(1);

function createControllerPointer() {
    const rayGroup = new THREE.Group();
    const lineGeo = new THREE.BufferGeometry().setFromPoints([new THREE.Vector3(0, 0, 0), new THREE.Vector3(0, 0, -4.0)]);
    const lineMat = new THREE.LineBasicMaterial({ color: 0x38bdf8, linewidth: 3, transparent: true, opacity: 0.85 });
    const rayLine = new THREE.Line(lineGeo, lineMat);
    const handGlow = new THREE.Mesh(new THREE.SphereGeometry(0.025, 12, 12), new THREE.MeshBasicMaterial({ color: 0x38bdf8 }));
    rayGroup.add(rayLine, handGlow);
    return rayGroup;
}

controller1.add(createControllerPointer());
controller2.add(createControllerPointer());
xrCameraRig.add(controller1);
xrCameraRig.add(controller2);
xrCameraRig.add(controllerGrip1);
xrCameraRig.add(controllerGrip2);

// Raycaster para interactuar apuntando directamente al menú 3D
const vrRaycaster = new THREE.Raycaster();
const vrTempMatrix = new THREE.Matrix4();

const vrHitMarker = new THREE.Mesh(
    new THREE.RingGeometry(0.02, 0.045, 24),
    new THREE.MeshBasicMaterial({ color: 0x38bdf8, side: THREE.DoubleSide, depthTest: false })
);
vrHitMarker.visible = false;
scene.add(vrHitMarker);

// Panel 3D Flotante de Game Over dentro de VR (Frente a los ojos del piloto a 0.85m)
const vrGameOverPanel = createVRGameOverPanel();
vrGameOverPanel.position.set(0, 0.05, -0.85);
vrGameOverPanel.visible = false;
xrCameraRig.add(vrGameOverPanel);

// Panel 3D Flotante de Smartphone / WhatsApp en VR (Hacia la derecha sobre la consola central a 0.55m)
const vrPhonePanel = createVRPhoneDistraction();
vrPhonePanel.position.set(0.32, -0.05, -0.55);
vrPhonePanel.visible = false;
xrCameraRig.add(vrPhonePanel);

// Panel 3D Flotante de Infracción de Tránsito en VR (Arriba en la franja del parasol a 0.80m)
const vrInfractionPanel = createVRInfractionPanel();
vrInfractionPanel.position.set(0, 0.35, -0.80);
vrInfractionPanel.visible = false;
xrCameraRig.add(vrInfractionPanel);
// Iluminación global clara
const ambientLight = new THREE.AmbientLight(0xffffff, 0.95);
scene.add(ambientLight);

const sunLight = new THREE.DirectionalLight(0xe2e8f0, 0.6);
sunLight.position.set(-20, 35, 10);
scene.add(sunLight);

// Generar Pista Infinita (Chunks de carretera)
const roadChunks = [];
const numChunks = 8;
const chunkLength = 40;

for (let i = 0; i < numChunks; i++) {
    const chunk = createRoadChunk(i, chunkLength);
    chunk.position.z = -i * chunkLength;
    scene.add(chunk);
    roadChunks.push(chunk);
}

// Lista de Obstáculos
const obstacles = [];

function spawnObstacle() {
    if (gameState !== 'playing') return;
    const isPedestrian = Math.random() > 0.68;

    let obs;
    if (isPedestrian) {
        obs = createPedestrian();
        const startLeft = Math.random() > 0.5;
        obs.position.set(startLeft ? -12.5 : 12.5, 0, -110 - Math.random() * 20);
        obs.userData.speedX = startLeft ? 0.065 : -0.065;
    } else {
        const color = trafficColors[Math.floor(Math.random() * trafficColors.length)];
        obs = createTrafficCar(color);
        
        // 4 Pistas:
        // [-8.0, -2.7] -> Contraflujo (Vienen de frente)
        // [+2.7, +8.0] -> Mismo sentido (Van hacia adelante)
        const laneConfigs = [
            { x: -8.0, isCounterFlow: true },
            { x: -2.7, isCounterFlow: true },
            { x: 2.7, isCounterFlow: false },
            { x: 8.0, isCounterFlow: false }
        ];

        const cfg = laneConfigs[Math.floor(Math.random() * laneConfigs.length)];
        obs.position.set(cfg.x, 0, -110 - Math.random() * 30);
        obs.userData.isCounterFlow = cfg.isCounterFlow;

        if (cfg.isCounterFlow) {
            // Vehículo en contraflujo: Orientado hacia el jugador (mirando hacia Z positiva)
            obs.rotation.y = Math.PI;
        } else {
            // Vehículo en el mismo sentido: Orientado hacia adelante (mirando hacia Z negativa)
            obs.rotation.y = 0;
        }
    }

    scene.add(obs);
    obstacles.push(obs);
}

// Controles y Teclado
let targetX = 0;
let isLeftDown = false;
let isRightDown = false;
let isBraking = false;
let isDownDown = false;
let distractionInterval;
let isDistractionActive = false;

window.addEventListener('keydown', (e) => {
    if (e.key === 'ArrowLeft' || e.key === 'a' || e.key === 'A') isLeftDown = true;
    if (e.key === 'ArrowRight' || e.key === 'd' || e.key === 'D') isRightDown = true;
    if (e.key === 'ArrowDown' || e.key === 's' || e.key === 'S') isDownDown = true;
    if (e.code === 'Space' || e.key === ' ') {
        e.preventDefault();
        isBraking = true;
    }
    if (e.key === 'c' || e.key === 'C') toggleCameraView();
});

window.addEventListener('keyup', (e) => {
    if (e.key === 'ArrowLeft' || e.key === 'a' || e.key === 'A') isLeftDown = false;
    if (e.key === 'ArrowRight' || e.key === 'd' || e.key === 'D') isRightDown = false;
    if (e.key === 'ArrowDown' || e.key === 's' || e.key === 'S') isDownDown = false;
    if (e.code === 'Space' || e.key === ' ') {
        e.preventDefault();
        isBraking = false;
    }
});

// Referencias a Controles Móviles
const elMobileControls = document.getElementById('mobile-controls');
const btnLeft = document.getElementById('btn-left');
const btnRight = document.getElementById('btn-right');
const btnDown = document.getElementById('btn-down');
const btnBrake = document.getElementById('btn-brake');

// Vincular botones móviles con touchstart/touchend y mousedown/mouseup
function bindTouchButton(btn, onStart, onEnd) {
    if (!btn) return;
    btn.addEventListener('touchstart', (e) => { e.preventDefault(); onStart(); }, { passive: false });
    btn.addEventListener('touchend', (e) => { e.preventDefault(); onEnd(); }, { passive: false });
    btn.addEventListener('mousedown', (e) => { e.preventDefault(); onStart(); });
    btn.addEventListener('mouseup', (e) => { e.preventDefault(); onEnd(); });
    btn.addEventListener('mouseleave', (e) => { onEnd(); });
}

bindTouchButton(btnLeft, () => { isLeftDown = true; }, () => { isLeftDown = false; });
bindTouchButton(btnRight, () => { isRightDown = true; }, () => { isRightDown = false; });
bindTouchButton(btnDown, () => { isDownDown = true; }, () => { isDownDown = false; });
bindTouchButton(btnBrake, () => { isBraking = true; }, () => { isBraking = false; });

function toggleCameraView() {
    cameraMode = (cameraMode === 'fpv') ? 'tpv' : 'fpv';
    elCamLabel.innerText = (cameraMode === 'fpv') ? '1ra Persona' : '3ra Persona';
}

function toggleVolumePopover() {
    const pop = document.getElementById('volume-popover');
    if (pop) {
        pop.classList.toggle('hidden');
    }
}

let lastVolumeLevel = 0.5;
function toggleMuteAudio() {
    if (currentVolume > 0) {
        lastVolumeLevel = currentVolume;
        setMasterVolume(0);
        const btn = document.getElementById('btn-mute');
        if (btn) btn.innerText = 'Restaurar';
    } else {
        setMasterVolume(lastVolumeLevel || 0.5);
        const btn = document.getElementById('btn-mute');
        if (btn) btn.innerText = 'Silenciar';
    }
}

function toggleQuestModal(show) {
    if (show) {
        elQuestModal.classList.remove('hidden');
    } else {
        elQuestModal.classList.add('hidden');
    }
}

// Soporte WebXR
let hasVRSupport = false;
if ('xr' in navigator) {
    navigator.xr.isSessionSupported('immersive-vr').then((supported) => {
        hasVRSupport = supported;
        const vrLabel = document.getElementById('vr-btn-label');
        if (supported && vrLabel) {
            vrLabel.innerText = '🥽 Entrar en VR (Meta Quest)';
        }
    }).catch(() => {});
}

async function handleVRButtonClick() {
    if (hasVRSupport) {
        toggleVRMode();
    } else {
        toggleQuestModal(true);
    }
}

async function toggleVRMode() {
    if (!navigator.xr) {
        toggleQuestModal(true);
        return;
    }

    if (!isVRActive) {
        try {
            const session = await navigator.xr.requestSession('immersive-vr', {
                optionalFeatures: ['local-floor', 'bounded-floor', 'hand-tracking']
            });
            await renderer.xr.setSession(session);
            vrSession = session;
            isVRActive = true;
            document.getElementById('vr-btn-label').innerText = 'Salir de VR';
            
            // Al entrar en VR, mostrar el menú 3D en el visor
            showVRMenu();

            session.addEventListener('end', () => {
                isVRActive = false;
                vrSession = null;
                document.getElementById('vr-btn-label').innerText = '🥽 Entrar en VR (Meta Quest)';
                if (vrMenuPanel) vrMenuPanel.visible = false;
                if (vrGameOverPanel) vrGameOverPanel.visible = false;
            });
        } catch (err) {
            console.error("No se pudo iniciar la sesión VR:", err);
            toggleQuestModal(true);
        }
    } else if (vrSession) {
        vrSession.end();
    }
}

let vrSelectedModeIdx = 0;
let vrStickDebounce = 0;

function showVRMenu() {
    gameState = 'menu';
    isBraking = false;
    isDownDown = false;
    recenterVRCockpit();
    if (player) player.visible = false; // Ocultar auto para no obstruir el menú en VR
    if (vrGameOverPanel) vrGameOverPanel.visible = false;
    if (vrHitMarker) vrHitMarker.visible = false;
    if (vrMenuPanel) {
        vrMenuPanel.position.set(0, 1.3, -1.4);
        vrMenuPanel.visible = true;
        vrMenuPanel.userData.render(vrSelectedModeIdx);
    }
}

// Iniciar Partida
function startGame(mode) {
    initAudio();

    currentMode = mode;
    gameState = 'playing';
    score = 0;
    targetX = 2.7; // Iniciar en el carril derecho (Pista 3)
    speedMultiplier = 0.75; // Arrancar a velocidad normal de crucero (~68 km/h)
    isBraking = false;
    isDownDown = false;

    if (player) player.visible = true;
    player.position.set(2.7, 0, 0);
    player.rotation.set(0, 0, 0);
    wheelGroup.rotation.z = 0;

    // Asegurar centrado perfecto de la cámara en el asiento del piloto
    recenterVRCockpit();

    obstacles.forEach(o => scene.remove(o));
    obstacles.length = 0;

    elMainMenu.classList.add('menu-hidden');
    elMainMenu.classList.remove('menu-visible');
    elGameOver.classList.add('menu-hidden');
    elGameOver.classList.remove('menu-visible');
    elGameOver.classList.add('hidden');
    elHud.classList.remove('opacity-0');
    elCamToggle.classList.remove('hidden');
    if (elBtnBackMenu) elBtnBackMenu.classList.remove('hidden');

    if (vrMenuPanel) vrMenuPanel.visible = false;
    if (vrGameOverPanel) vrGameOverPanel.visible = false;
    if (elMobileControls) elMobileControls.classList.remove('hidden');

    elCanvas.className = '';
    clearInterval(distractionInterval);
    elDistraction.classList.add('hidden');
    isDistractionActive = false;

    if (mode === 'normal') {
        elStatus.innerText = '100% Lúcido';
        elStatus.className = 'font-bold text-sky-400 text-base sm:text-lg uppercase tracking-wider';
        elStatusDot.className = 'w-2.5 h-2.5 rounded-full bg-sky-400 animate-pulse';
        scene.fog.color.setHex(0x0f172a);
        renderer.setClearColor(0x0f172a);
    } else if (mode === 'drunk') {
        elStatus.innerText = 'Intoxicado (Alcohol)';
        elStatus.className = 'font-bold text-purple-400 text-base sm:text-lg uppercase tracking-wider animate-pulse';
        elStatusDot.className = 'w-2.5 h-2.5 rounded-full bg-purple-400 animate-ping';
        elCanvas.classList.add('drunk-effect');
        scene.fog.color.setHex(0x2e1065);
        renderer.setClearColor(0x2e1065);
    } else if (mode === 'distracted') {
        elStatus.innerText = 'Distraído (Celular)';
        elStatus.className = 'font-bold text-amber-400 text-base sm:text-lg uppercase tracking-wider';
        elStatusDot.className = 'w-2.5 h-2.5 rounded-full bg-amber-400 animate-ping';
        scene.fog.color.setHex(0x0f172a);
        renderer.setClearColor(0x0f172a);
        distractionInterval = setInterval(triggerDistraction, 4500 + Math.random() * 2500);
    }

    setTimeout(spawnObstacle, 800);
    setTimeout(spawnObstacle, 2200);
}

const phoneNotifications = [
    { sender: 'Mamá 👩', avatar: '👩', text: '¿A qué hora llegas? 😡 ¡Acuérdate que mañana tienes que levantarte temprano!', lines: ['¿A qué hora llegas? 😡', '¡Mañana tienes que levantarte temprano!', '¡Respóndeme por favor!'] },
    { sender: 'Jefe / Trabajo 💼', avatar: '👨‍💼', text: 'URGENTE: Necesito el reporte final en mi correo ahora mismo.', lines: ['URGENTE ⚠️', 'Necesito el informe final en mi correo', '¿Puedes enviarlo ahora mismo?'] },
    { sender: 'Grupo Amigos 🎉', avatar: '🍻', text: '¡Ya llegamos todos al carrete! ¿Dónde vienes? Apúrate que se acaba la previa.', lines: ['¡Ya llegamos todos al carrete! 🍻', '¿Dónde vienes? ¡Apúrate!', 'Se está acabando la previa 🎶'] },
    { sender: 'Pareja ❤️', avatar: '🥰', text: 'Amor, ¿puedes pasar a comprar pan antes de venir? Te amo.', lines: ['Amor, ¿puedes pasar a comprar pan? 🍞', '¡Antes de que cierre el negocio!', 'Te amo ❤️'] },
    { sender: 'Banco Alerta 💳', avatar: '🏦', text: 'Compra aprobada por $45.990 en tienda online. Si no reconoce esta compra...', lines: ['ALERTA DE SEGURIDAD 💳', 'Compra aprobada por $45.990 en línea', '¿Reconoce esta transacción?'] }
];

function triggerDistraction() {
    if (gameState !== 'playing') return;
    isDistractionActive = true;

    // 1. Elegir notificación aleatoria
    const notif = phoneNotifications[Math.floor(Math.random() * phoneNotifications.length)];
    const elAvatar = document.getElementById('phone-avatar');
    const elSender = document.getElementById('phone-sender');
    const elBody = document.getElementById('phone-body');
    const elBtnDismiss = document.getElementById('phone-btn-dismiss');

    if (elAvatar) elAvatar.innerText = notif.avatar;
    if (elSender) elSender.innerText = notif.sender;
    if (elBody) elBody.innerText = notif.text;

    // 2. Aleatorizar la posición de la ventana del celular en pantalla (para que nunca salga en el mismo lugar)
    const positions = [
        { top: '15%', left: '30%', transform: 'translate(-50%, 0)' },
        { top: '22%', left: '50%', transform: 'translate(-50%, 0)' },
        { top: '18%', left: '70%', transform: 'translate(-50%, 0)' },
        { top: '35%', left: '35%', transform: 'translate(-50%, 0)' },
        { top: '32%', left: '65%', transform: 'translate(-50%, 0)' }
    ];
    const pos = positions[Math.floor(Math.random() * positions.length)];
    elDistraction.style.top = pos.top;
    elDistraction.style.left = pos.left;
    elDistraction.style.transform = pos.transform;

    // 3. Aleatorizar la posición del botón de cerrar (izquierda, centro, derecha)
    const btnAligns = ['flex justify-start', 'flex justify-center', 'flex justify-end'];
    const selectedAlign = ['left', 'center', 'right'][Math.floor(Math.random() * 3)];
    const elFooter = document.getElementById('phone-footer');
    if (elFooter) {
        elFooter.className = 'bg-slate-100 p-2.5 border-t border-slate-200 ' + btnAligns[Math.floor(Math.random() * btnAligns.length)];
    }

    elDistraction.classList.remove('hidden');

    // 4. Mostrar teléfono flotante en Realidad Virtual en posiciones y orientaciones dinámicas
    if (renderer.xr.isPresenting && vrPhonePanel) {
        const vrOffsets = [
            { x: 0.22, y: -0.05, z: -0.95 },
            { x: -0.22, y: -0.05, z: -0.95 },
            { x: 0.0, y: 0.12, z: -0.90 },
            { x: 0.28, y: 0.10, z: -0.92 }
        ];
        const vPos = vrOffsets[Math.floor(Math.random() * vrOffsets.length)];
        vrPhonePanel.position.set(vPos.x, vPos.y, vPos.z);
        vrPhonePanel.userData.render({ ...notif, btnAlign: selectedAlign });
        vrPhonePanel.visible = true;
    }

    if (notificationSynth) {
        notificationSynth.triggerAttackRelease(["E5", "B5"], [0.1, 0.1], undefined, 0.5);
        setTimeout(() => notificationSynth.triggerAttackRelease(["G5", "E5"], [0.1, 0.1]), 120);
    }

    targetX += (Math.random() > 0.5 ? 1 : -1) * 3.2;
}

function dismissDistraction() {
    isDistractionActive = false;
    elDistraction.classList.add('hidden');
    if (vrPhonePanel) vrPhonePanel.visible = false;
}

let lastInfractionTime = 0;
function showTrafficInfraction(message, title, subdesc) {
    const now = Date.now();
    if (now - lastInfractionTime < 4500) return; // Debounce de 4.5 segundos
    lastInfractionTime = now;

    // Alerta sonora
    if (hornSynth) {
        hornSynth.triggerAttackRelease(["F4", "A4"], 0.4);
    } else if (notificationSynth) {
        notificationSynth.triggerAttackRelease(["A4", "D4"], [0.2, 0.3]);
    }

    // Banner en Pantalla (2D)
    const elBanner = document.getElementById('traffic-violation-banner');
    if (elBanner) {
        const elTitle = elBanner.querySelector('.infraction-title') || elBanner.querySelector('div.font-black');
        const elDesc = elBanner.querySelector('.infraction-desc') || elBanner.querySelector('div.text-xs');
        if (elTitle) elTitle.innerText = title || '¡Infracción Gravísima!';
        if (elDesc) elDesc.innerText = message || '¡Frena y respeta las señales de tránsito!';
        
        elBanner.classList.remove('hidden');
        setTimeout(() => {
            elBanner.classList.add('hidden');
        }, 4000);
    }

    // Banner 3D en Realidad Virtual (VR)
    if (renderer.xr.isPresenting && vrInfractionPanel) {
        vrInfractionPanel.userData.show(
            title || '⚠️ INFRACCIÓN DE TRÁNSITO',
            message || '¡Cruzaste con luz roja! Debes detenerte completamente.',
            subdesc || 'Ley de Tránsito: Velocidad máxima urbana 50 km/h.'
        );
        vrInfractionPanel.visible = true;
        setTimeout(() => {
            vrInfractionPanel.visible = false;
        }, 4000);
    }
}

function triggerGameOver(obstacleType, causeReason) {
    gameState = 'crashing';
    clearInterval(distractionInterval);
    elDistraction.classList.add('hidden');
    if (vrPhonePanel) vrPhonePanel.visible = false;
    if (elMobileControls) elMobileControls.classList.add('hidden');
    elHud.classList.add('opacity-0');
    elCamToggle.classList.add('hidden');
    if (elBtnBackMenu) elBtnBackMenu.classList.add('hidden');

    stopEngineAudio();
    setTimeout(() => { 
        if (crashSynth) crashSynth.triggerAttackRelease("1n"); 
        if (crashSub) crashSub.triggerAttackRelease("C1", "2n");
    }, 120);

    // Ocultar paneles secundarios en VR para evitar superposiciones
    if (vrInfractionPanel) vrInfractionPanel.visible = false;

    let currentKmh = Math.floor(speedMultiplier * 90);
    let reactionSeconds = currentMode === 'drunk' ? "2.6s (Retardo)" : (currentMode === 'distracted' ? "3.2s (Ceguera)" : "0.9s (Alerta)");
    let brakingMeters = Math.floor((currentKmh * 0.278) * (currentMode === 'normal' ? 1.2 : 2.8)) + " metros";

    elStats.innerHTML = `
        <div class="bg-slate-950/60 p-3 rounded-2xl border border-slate-800">
            <span class="block text-red-400 font-black text-2xl font-mono">${currentKmh}</span>
            <span class="text-slate-400 text-xs uppercase font-bold">KM/H Impacto</span>
        </div>
        <div class="bg-slate-950/60 p-3 rounded-2xl border border-slate-800">
            <span class="block text-amber-400 font-black text-2xl font-mono">${reactionSeconds.split(' ')[0]}</span>
            <span class="text-slate-400 text-xs uppercase font-bold">T. Reacción</span>
        </div>
        <div class="bg-slate-950/60 p-3 rounded-2xl border border-slate-800">
            <span class="block text-sky-400 font-black text-2xl font-mono">${brakingMeters}</span>
            <span class="text-slate-400 text-xs uppercase font-bold">Distancia Frenado</span>
        </div>
    `;

    if (obstacleType === 'pedestrian') {
        elMessage.innerHTML = currentMode === 'drunk' ?
            "<strong class='text-purple-300 font-bold'>Retardo por alcohol:</strong> Tu visión en túnel y tus reflejos disminuidos te impidieron esquivar al peatón a tiempo. A más de 50 km/h el atropello es casi 100% mortal." :
            (currentMode === 'distracted' ? "<strong class='text-orange-300 font-bold'>Ceguera inatencional:</strong> Mirar una notificación por 3 segundos a 80 km/h equivale a avanzar 66 metros completamente a ciegas. Arrollaste a un peatón sin frenar." : "<strong class='text-blue-300 font-bold'>Precaución vial:</strong> Aún con atención total, los imprevistos en cruces peatonales exigen velocidad moderada y prudencia.");
    } else {
        elMessage.innerHTML = currentMode === 'drunk' ?
            "<strong class='text-purple-300 font-bold'>Falla neuromuscular:</strong> El alcohol genera una ilusión de control, pero tus manos tardaron valiosos segundos en responder. El choque frontal desató fuerzas G destructivas." :
            (currentMode === 'distracted' ? "<strong class='text-orange-300 font-bold'>Distracción mortal:</strong> El cerebro humano no puede procesar un mensaje de texto y conducir al mismo tiempo. Perdiste tu carril en una fracción de segundo." : "<strong class='text-blue-300 font-bold'>Conducción a la defensiva:</strong> Mantén siempre tu distancia y respeta los límites de velocidad para tener margen de maniobra.");
    }

    // Mostrar panel flotante 3D si estamos en Realidad Virtual (Frente a los ojos dentro del auto)
    if (renderer.xr.isPresenting && vrGameOverPanel) {
        vrGameOverPanel.userData.update('¡IMPACTO FATAL!', obstacleType === 'pedestrian' ? 'Atropello a peatón en cruce' : 'Colisión frontal contra vehículo', `${currentKmh} KM/H • ${reactionSeconds.split(' ')[0]}`);
        vrGameOverPanel.position.set(0, 0.05, -1.2);
        vrGameOverPanel.rotation.set(0, 0, 0);
        vrGameOverPanel.visible = true;
    }

    elCanvas.className = '';
    const flash = document.createElement('div');
    flash.className = 'absolute inset-0 bg-red-600 z-[99] pointer-events-none opacity-90 transition-opacity duration-1000';
    document.body.appendChild(flash);

    setTimeout(() => {
        flash.style.opacity = '0';
        elGameOver.classList.remove('menu-hidden');
        elGameOver.classList.remove('hidden');
        setTimeout(() => flash.remove(), 1000);
    }, 1200);
}

function resetGame() {
    gameState = 'menu';
    isBraking = false;
    isDownDown = false;
    clearInterval(distractionInterval);
    elDistraction.classList.add('hidden');
    stopEngineAudio();

    if (elMobileControls) elMobileControls.classList.add('hidden');
    if (elBtnBackMenu) elBtnBackMenu.classList.add('hidden');
    if (elCamToggle) elCamToggle.classList.add('hidden');
    if (elHud) elHud.classList.add('opacity-0');
    if (vrGameOverPanel) vrGameOverPanel.visible = false;
    
    elGameOver.classList.add('menu-hidden');
    elGameOver.classList.add('hidden');
    elMainMenu.classList.remove('menu-hidden');
    elMainMenu.classList.remove('hidden', 'opacity-0', 'pointer-events-none');
    elMainMenu.classList.add('menu-visible');
    
    player.position.set(0, 0, 0);
    player.rotation.set(0, 0, 0);
    
    if (renderer.xr.isPresenting) {
        recenterVRCockpit();
        showVRMenu();
    } else {
        camera.position.set(0, 2.5, 7.0);
        camera.lookAt(0, 1.0, -10);
    }

    if (cabin) cabin.visible = true;
    if (roof) roof.visible = true;
}

// Bucle de Animación y Física
function animate() {
    // Lectura de mandos Meta Quest en cualquier estado
    if (renderer.xr.isPresenting) {
        const session = renderer.xr.getSession();
        if (session && session.inputSources) {
            let stickXInput = 0;
            let stickYInput = 0;
            let gripPressed = false;
            let triggerPressed = false;
            let buttonPrimary = false;   // A o X
            let buttonSecondary = false; // B o Y (Menú)
            let thumbstickClick = false; // Click en palanca (L3 o R3) para centrar vista

            for (const source of session.inputSources) {
                if (source.gamepad) {
                    const gp = source.gamepad;
                    // Detectar botones
                    if (gp.buttons) {
                        // Botón Trigger (índice 0)
                        if (gp.buttons[0] && gp.buttons[0].pressed) triggerPressed = true;
                        // Botón Grip (índice 1 - botón de agarrar lateral)
                        if (gp.buttons[1] && gp.buttons[1].pressed) gripPressed = true;
                        // Botón Thumbstick click (índice 3 - pulsar palanca)
                        if (gp.buttons[3] && gp.buttons[3].pressed) thumbstickClick = true;
                        // Botones A/X (índice 4)
                        if (gp.buttons[4] && gp.buttons[4].pressed) buttonPrimary = true;
                        // Botones B/Y o Menú (índice 5)
                        if (gp.buttons[5] && gp.buttons[5].pressed) buttonSecondary = true;
                    }
                    // Detectar joystick
                    if (gp.axes && gp.axes.length >= 2) {
                        const sx = (gp.axes.length >= 4) ? gp.axes[2] : gp.axes[0];
                        const sy = (gp.axes.length >= 4) ? gp.axes[3] : gp.axes[1];
                        if (Math.abs(sx) > 0.12) stickXInput = sx;
                        if (Math.abs(sy) > 0.25) stickYInput = sy;
                    }
                }
            }

            // Pulsar Joystick (R3 / L3) para centrar y calibrar vista instantáneamente
            if (thumbstickClick) {
                recenterVRCockpit();
            }

            // Manejo de Menú en VR (Raycasting con Puntero Láser y Joystick)
            if (gameState === 'menu') {
                const now = Date.now();
                let rayPointedIdx = -1;

                // Raycast desde los mandos hacia el panel del menú 3D
                if (vrMenuPanel && vrMenuPanel.visible) {
                    let hitFound = false;
                    const controllers = [controller1, controller2];

                    for (const ctrl of controllers) {
                        vrTempMatrix.identity().extractRotation(ctrl.matrixWorld);
                        const origin = new THREE.Vector3().setFromMatrixPosition(ctrl.matrixWorld);
                        const dir = new THREE.Vector3(0, 0, -1).applyMatrix4(vrTempMatrix).normalize();
                        
                        vrRaycaster.set(origin, dir);
                        const intersects = vrRaycaster.intersectObject(vrMenuPanel);

                        if (intersects.length > 0) {
                            const hit = intersects[0];
                            // Posicionar el punto luminoso azul en la superficie del menú
                            vrHitMarker.position.copy(hit.point);
                            vrHitMarker.position.z += 0.005; // Leve offset frontal para evitar z-fighting
                            vrHitMarker.quaternion.copy(vrMenuPanel.quaternion);
                            vrHitMarker.visible = true;
                            hitFound = true;

                            // Mapear coordenada UV de impacto a las 7 opciones (de 1920px de altura)
                            // y: 250 + idx * 155 -> UV 1.0 (arriba) a 0.0 (abajo)
                            if (hit.uv) {
                                const uvY = hit.uv.y; 
                                if (uvY >= 0.80 && uvY <= 0.89) rayPointedIdx = 0;
                                else if (uvY >= 0.72 && uvY < 0.80) rayPointedIdx = 1;
                                else if (uvY >= 0.64 && uvY < 0.72) rayPointedIdx = 2;
                                else if (uvY >= 0.56 && uvY < 0.64) rayPointedIdx = 3; // Centrar vista
                                else if (uvY >= 0.48 && uvY < 0.56) rayPointedIdx = 4; // Volumen
                                else if (uvY >= 0.40 && uvY < 0.48) rayPointedIdx = 5; // Cámara
                                else if (uvY >= 0.31 && uvY < 0.40) rayPointedIdx = 6; // Salir
                            }
                            break;
                        }
                    }

                    if (!hitFound) {
                        vrHitMarker.visible = false;
                    }
                }

                // Si el puntero láser apunta a un botón, seleccionarlo visualmente de inmediato
                if (rayPointedIdx !== -1 && rayPointedIdx !== vrSelectedModeIdx) {
                    vrSelectedModeIdx = rayPointedIdx;
                    vrMenuPanel.userData.render(vrSelectedModeIdx);
                } else if (now - vrStickDebounce > 260) {
                    // Navegación con palanca física (7 opciones: 0 a 6)
                    if (stickYInput > 0.3) {
                        vrSelectedModeIdx = Math.min(6, vrSelectedModeIdx + 1);
                        vrMenuPanel.userData.render(vrSelectedModeIdx);
                        vrStickDebounce = now;
                    } else if (stickYInput < -0.3) {
                        vrSelectedModeIdx = Math.max(0, vrSelectedModeIdx - 1);
                        vrMenuPanel.userData.render(vrSelectedModeIdx);
                        vrStickDebounce = now;
                    }
                }

                // Iniciar juego, alternar volumen, cambiar cámara o salir de VR con Gatillo o Botón A/X
                if (triggerPressed || buttonPrimary) {
                    if (vrSelectedModeIdx === 3) {
                        // Centrar vista en el asiento
                        if (now - vrStickDebounce > 280) {
                            recenterVRCockpit();
                            vrStickDebounce = now;
                        }
                    } else if (vrSelectedModeIdx === 4) {
                        if (now - vrStickDebounce > 280) {
                            // Alternar volumen en ciclos: 50% -> 75% -> 100% -> 25% -> 50%
                            let nextVol = currentVolume + 0.25;
                            if (nextVol > 1.05) nextVol = 0.25;
                            setMasterVolume(nextVol);
                            vrMenuPanel.userData.render(4);
                            vrStickDebounce = now;
                        }
                    } else if (vrSelectedModeIdx === 5) {
                        // Alternar vista interior (habitáculo) o exterior (3ra persona)
                        if (now - vrStickDebounce > 280) {
                            toggleCameraView();
                            vrMenuPanel.userData.render(5);
                            vrStickDebounce = now;
                        }
                    } else if (vrSelectedModeIdx === 6) {
                        // Salir de Realidad Virtual
                        if (vrSession) {
                            vrHitMarker.visible = false;
                            vrSession.end();
                        }
                    } else {
                        const modes = ['normal', 'drunk', 'distracted'];
                        vrHitMarker.visible = false;
                        startGame(modes[vrSelectedModeIdx]);
                    }
                }
            } else if (gameState === 'crashing') {
                // Reinicio desde choque
                if (triggerPressed || buttonPrimary || gripPressed || buttonSecondary) {
                    resetGame();
                }
            } else if (gameState === 'playing') {
                // Si la distracción de celular está activa y se pulsa el gatillo, cerrarla
                if (isDistractionActive && (triggerPressed || buttonPrimary)) {
                    dismissDistraction();
                }

                // Dirección suave con Joystick
                if (Math.abs(stickXInput) > 0.1) {
                    targetX += stickXInput * 0.22;
                }
                // Freno al mantener Grip o Botón A/X
                isBraking = gripPressed || buttonPrimary;

                // Botón B / Y en mandos VR para volver al menú en cualquier momento
                if (buttonSecondary) {
                    resetGame();
                }
            }
        }
    }

    if (gameState === 'playing') {
        // Dinámica de aceleración urbana realista (Crucero cómodo de 50 a 60 km/h)
        if (isBraking) {
            // Frenado fuerte / parada en semáforo: Desacelera hasta 0.0 (Detención total)
            speedMultiplier = Math.max(0.0, speedMultiplier - 0.035);
            if (elBrakeIndicator) elBrakeIndicator.classList.remove('hidden');
        } else if (isDownDown) {
            // Desacelerar con flecha abajo: Desacelera suavemente hasta 0.0
            speedMultiplier = Math.max(0.0, speedMultiplier - 0.015);
            if (elBrakeIndicator) elBrakeIndicator.classList.remove('hidden');
        } else {
            // Recuperación de aceleración de crucero suave y controlable (tope 60 km/h / 0.75)
            if (speedMultiplier < 0.2) {
                speedMultiplier += 0.012; // Arranca de 0 suavemente
            } else if (speedMultiplier < 0.65) {
                speedMultiplier += 0.008; // Sube a velocidad urbana normal (~55 km/h)
            } else {
                speedMultiplier += 0.0001;
            }
            speedMultiplier = Math.min(speedMultiplier, 0.75); // Máximo 60 km/h para control seguro
            if (elBrakeIndicator) elBrakeIndicator.classList.add('hidden');
        }

        // Actualizar motor de audio realista
        updateEngineAudio(speedMultiplier, isBraking);

        score += speedMultiplier * 0.008;
        elScore.innerText = score.toFixed(1) + " km";

        let displaySpeed = Math.floor(speedMultiplier * 80);
        elSpeed.innerText = displaySpeed;
        elRpmBar.style.width = `${((Math.max(0, speedMultiplier - 0.05)) / 0.75) * 100}%`;

        // Actualizar Velocímetro Digital y Tacómetro del Cockpit 3D (Visible en VR y FPV)
        if (playerVehicle && playerVehicle.updateCluster) {
            playerVehicle.updateCluster(displaySpeed, isBraking);
        }

        // DETECCIÓN DE EXCESO DE VELOCIDAD URBANA (> 50 km/h)
        if (displaySpeed > 50) {
            if (!window.speedingStartTime) {
                window.speedingStartTime = Date.now();
            } else if (Date.now() - window.speedingStartTime > 2400) {
                // Si mantiene más de 50 km/h por más de 2.4s, disparar infracción
                showTrafficInfraction(
                    `¡Infracción por Exceso de Velocidad! Circulas a ${displaySpeed} km/h (Límite Urbano: 50 km/h).`,
                    '⚡ EXCESO DE VELOCIDAD',
                    'Ley de Tránsito: La velocidad máxima en zona urbana es 50 km/h.'
                );
                window.speedingStartTime = Date.now(); // Reiniciar ventana de conteo
            }
        } else {
            window.speedingStartTime = 0;
        }

        // Control lateral (Ampliado para las 4 pistas de la avenida: de -10.5 a +10.5)
        if (isLeftDown) targetX -= 0.22;
        if (isRightDown) targetX += 0.22;
        targetX = Math.max(-10.5, Math.min(10.5, targetX));

        if (currentMode === 'drunk') {
            player.position.x += (targetX - player.position.x) * 0.02;
            player.position.x += Math.sin(Date.now() * 0.002) * 0.08;
        } else {
            player.position.x += (targetX - player.position.x) * 0.14;
        }

        const steerAngle = (player.position.x - targetX) * 0.7;
        wheelGroup.rotation.z = steerAngle;
        player.rotation.z = steerAngle * 0.06;
        player.rotation.y = steerAngle * 0.04;

        playerWheels.forEach(w => {
            w.children[0].rotation.x -= speedMultiplier * 0.6;
            w.children[1].rotation.x -= speedMultiplier * 0.6;
        });

        // Actualización de Cámara sincronizada con el auto
        if (renderer.xr.isPresenting) {
            // En Realidad Virtual: Mantener el rig de cámara fijo exactamente en el asiento del piloto
            // Esto permite rotación libre 360° (mirar a los lados, espejos y tablero) sin que la cámara se desplace fuera del auto
            xrCameraRig.position.set(-0.48, 0.96, 0.15);
            
            const xrCam = renderer.xr.getCamera();
            if (xrCam && xrCam.cameras && xrCam.cameras.length > 0) {
                // Compensar cualquier deriva de traslación del visor para fijar la cabeza en el asiento
                xrCameraRig.position.x = -0.48 - xrCam.position.x;
                xrCameraRig.position.y = 0.96 - xrCam.position.y;
                xrCameraRig.position.z = 0.15 - xrCam.position.z;
            }

            if (cabin) cabin.visible = false;
            if (roof) roof.visible = false;
        } else if (cameraMode === 'fpv') {
            // Modo Primera Persona en pantalla plana (PC / Celular)
            if (cabin) cabin.visible = false;
            if (roof) roof.visible = false;
            const headBob = currentMode === 'drunk' ? Math.sin(Date.now() * 0.002) * 0.04 : 0;
            camera.position.set(player.position.x - 0.48 + headBob, 1.28, player.position.z + 0.15);
            camera.rotation.set(
                -0.03, // Leve inclinación hacia abajo para ver el volante, velocímetro y la pista al frente
                (targetX - player.position.x) * 0.04,
                currentMode === 'drunk' ? Math.sin(Date.now() * 0.0015) * 0.05 : (targetX - player.position.x) * 0.03
            );
        } else {
            // Modo Tercera Persona en pantalla plana
            if (cabin) cabin.visible = true;
            if (roof) roof.visible = true;
            camera.position.set(player.position.x * 0.8, 3.4, player.position.z + 6.2);
            camera.lookAt(player.position.x, 1.1, player.position.z - 15);
        }

        // Avance de la carretera según la velocidad del jugador
        const moveDist = speedMultiplier * 1.15;
        roadChunks.forEach(chunk => {
            chunk.position.z += moveDist;

            if (chunk.userData.type === 'intersection') {
                const time = Date.now() * 0.001;
                // Ciclo de semáforo: 0..6 Verde, 6..8 Amarillo, 8..12 Rojo
                const cycle = (time + chunk.position.z * 0.05) % 12;
                let state = (cycle > 6 && cycle <= 8) ? 1 : ((cycle > 8) ? 2 : 0);
                chunk.userData.trafficState = state; // Guardar estado actual (2 = Rojo)

                chunk.userData.trafficLights.forEach(tl => {
                    const ud = tl.userData;
                    ud.r.material.color.setHex(state === 2 ? 0xff0000 : 0x220000);
                    ud.y.material.color.setHex(state === 1 ? 0xffbb00 : 0x221100);
                    ud.g.material.color.setHex(state === 0 ? 0x00ff00 : 0x002200);
                });

                // DETECCIÓN DE INFRACCIÓN: Cruzar la línea de cruce peatonal (Z entre -1.5 y 2.5) con luz roja y velocidad > 10 km/h
                if (state === 2 && speedMultiplier > 0.12 && chunk.position.z >= -2.0 && chunk.position.z <= 3.0 && !chunk.userData.violationRecorded) {
                    chunk.userData.violationRecorded = true;
                    if (currentMode === 'drunk') {
                        showTrafficInfraction(
                            '¡Semáforo en Rojo Ignorado! Bajo el alcohol perdiste la noción de las señales y no pudiste frenar.',
                            '🛑 LUZ ROJA BAJO ALCOHOL',
                            'El alcohol anula el campo visual y la reacción de frenado ante luces rojas.'
                        );
                    } else {
                        showTrafficInfraction(
                            '¡Infracción Gravísima! Cruzaste la intersección con semáforo en rojo.',
                            '🛑 SEMÁFORO EN ROJO',
                            'Detén el vehículo por completo antes de la línea de detención.'
                        );
                    }
                }
            }

            if (chunk.position.z > chunkLength) {
                chunk.position.z -= roadChunks.length * chunkLength;
                if (chunk.userData.type === 'intersection') {
                    chunk.userData.violationRecorded = false; // Resetear para el próximo ciclo de la pista
                }
            }
        });

        // Obstáculos y Tráfico Autónomo (Siguen avanzando con su propia velocidad constante aunque el jugador frene)
        for (let i = obstacles.length - 1; i >= 0; i--) {
            let obs = obstacles[i];

            if (obs.userData.type === 'pedestrian') {
                obs.position.x += obs.userData.speedX;
                obs.position.z += moveDist; // El peatón está cruzando la calzada
                obs.userData.legs[0].rotation.x = Math.sin(Date.now() * 0.012) * 0.6;
                obs.userData.legs[1].rotation.x = -Math.sin(Date.now() * 0.012) * 0.6;
            } else {
                // Tráfico Autónomo:
                // Velocidad propia del vehículo de tráfico en el mundo
                const trafficOwnSpeed = 0.55; 
                if (obs.userData.isCounterFlow) {
                    // Contraflujo (Vienen hacia el jugador de frente): Avanza con su propia velocidad + avance del jugador
                    obs.position.z += (trafficOwnSpeed + moveDist);
                } else {
                    // Mismo sentido (Va hacia adelante): Avanza alejándose por su velocidad propia (-trafficOwnSpeed), 
                    // compensado por el avance relativo de nuestro auto (+moveDist)
                    obs.position.z += (moveDist - trafficOwnSpeed);
                }
            }

            const distZ = Math.abs(obs.position.z - player.position.z);
            const distX = Math.abs(obs.position.x - player.position.x);
            const widthLimit = obs.userData.type === 'pedestrian' ? 1.6 : 2.4;

            if (distZ < 2.8 && distX < widthLimit && obs.position.z < 1.0 && obs.position.z > -2.0) {
                triggerGameOver(obs.userData.type);
            }

            // Reciclar obstáculos si ya quedaron muy atrás (+20m) o si un auto del mismo sentido se alejó demasiado (-140m)
            if (obs.position.z > 20 || obs.position.z < -160) {
                scene.remove(obs);
                obstacles.splice(i, 1);
                spawnObstacle();
            }
        }
    } else if (gameState === 'crashing') {
        if (renderer.xr.isPresenting) {
            // Mantener al piloto exactamente en su asiento durante el impacto
            xrCameraRig.position.set(-0.48, 0.96, 0.15);
        } else {
            camera.position.z -= 0.5;
            camera.position.y -= 0.04;
            camera.rotation.x -= 0.08;
            camera.rotation.z += (Math.random() - 0.5) * 0.25;
        }
    }

    renderer.render(scene, camera);
}

window.addEventListener('resize', () => {
    camera.aspect = window.innerWidth / window.innerHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(window.innerWidth, window.innerHeight);
});

renderer.setAnimationLoop(animate);
