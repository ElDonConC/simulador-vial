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

// Rig de Cámara para sincronización de movimiento 6DOF en Realidad Virtual
const xrCameraRig = new THREE.Group();
xrCameraRig.add(camera);
scene.add(xrCameraRig);

// Controladores Touch y Rayos Láser Visibles (Manos en VR)
const controller1 = renderer.xr.getController(0);
const controller2 = renderer.xr.getController(1);
const controllerGrip1 = renderer.xr.getControllerGrip(0);
const controllerGrip2 = renderer.xr.getControllerGrip(1);

function createControllerPointer() {
    const rayGroup = new THREE.Group();
    // Línea láser brillante de 4 metros
    const lineGeo = new THREE.BufferGeometry().setFromPoints([new THREE.Vector3(0, 0, 0), new THREE.Vector3(0, 0, -4.0)]);
    const lineMat = new THREE.LineBasicMaterial({ color: 0x38bdf8, linewidth: 3, transparent: true, opacity: 0.85 });
    const rayLine = new THREE.Line(lineGeo, lineMat);
    // Esfera emisiva en la punta de la mano
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

// Punto luminoso de impacto del láser sobre el panel del menú
const vrHitMarker = new THREE.Mesh(
    new THREE.RingGeometry(0.02, 0.045, 24),
    new THREE.MeshBasicMaterial({ color: 0x38bdf8, side: THREE.DoubleSide, depthTest: false })
);
vrHitMarker.visible = false;
scene.add(vrHitMarker);

// Menú 3D Flotante de inicio / selección de modo en VR (ubicado dentro de la cabina)
const vrMenuPanel = createVRMenuPanel();
vrMenuPanel.position.set(0, 1.25, -1.5);
vrMenuPanel.visible = false;
scene.add(vrMenuPanel);

// Panel 3D Flotante de Game Over dentro de VR (anclado directamente al visor XR)
const vrGameOverPanel = createVRGameOverPanel();
vrGameOverPanel.position.set(0, 0.05, -1.45);
vrGameOverPanel.visible = false;
xrCameraRig.add(vrGameOverPanel);

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

// Inicializar Vehículo del Jugador
const playerVehicle = createPlayerVehicle();
const player = playerVehicle.mesh;
const cabin = playerVehicle.cabin;
const roof = playerVehicle.roof;
const wheelGroup = playerVehicle.wheelGroup;
const playerWheels = playerVehicle.playerWheels;
const tailMat = playerVehicle.tailMat;
scene.add(player);

// Posición inicial de cámara en el menú
camera.position.set(0, 2.5, 7.0);
camera.lookAt(0, 1.0, -10);

// Lista de Obstáculos
const obstacles = [];

function spawnObstacle() {
    if (gameState !== 'playing') return;
    const isPedestrian = Math.random() > 0.65;

    let obs;
    if (isPedestrian) {
        obs = createPedestrian();
        const startLeft = Math.random() > 0.5;
        obs.position.set(startLeft ? -9 : 9, 0, -110 - Math.random() * 20);
        obs.userData.speedX = startLeft ? 0.055 : -0.055;
    } else {
        const color = trafficColors[Math.floor(Math.random() * trafficColors.length)];
        obs = createTrafficCar(color);
        const lanes = [-4.0, 0, 4.0];
        const laneX = lanes[Math.floor(Math.random() * lanes.length)];
        obs.position.set(laneX, 0, -110 - Math.random() * 30);
        
        if (laneX === -4.0) {
            obs.rotation.y = Math.PI; // Tráfico contrario
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
    targetX = 0;
    speedMultiplier = 0.75; // Arrancar a velocidad normal de crucero (~68 km/h)
    isBraking = false;
    isDownDown = false;

    if (player) player.visible = true;
    player.position.set(0, 0, 0);
    player.rotation.set(0, 0, 0);
    wheelGroup.rotation.z = 0;

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

function triggerDistraction() {
    if (gameState !== 'playing') return;
    isDistractionActive = true;
    elDistraction.classList.remove('hidden');

    if (notificationSynth) {
        notificationSynth.triggerAttackRelease(["E5", "B5"], [0.1, 0.1], undefined, 0.5);
        setTimeout(() => notificationSynth.triggerAttackRelease(["G5", "E5"], [0.1, 0.1]), 120);
    }

    targetX += (Math.random() > 0.5 ? 1 : -1) * 3.2;
}

function dismissDistraction() {
    isDistractionActive = false;
    elDistraction.classList.add('hidden');
}

function triggerGameOver(obstacleType) {
    gameState = 'crashing';
    clearInterval(distractionInterval);
    elDistraction.classList.add('hidden');
    if (elMobileControls) elMobileControls.classList.add('hidden');
    elHud.classList.add('opacity-0');
    elCamToggle.classList.add('hidden');
    if (elBtnBackMenu) elBtnBackMenu.classList.add('hidden');

    stopEngineAudio();
    setTimeout(() => { 
        if (crashSynth) crashSynth.triggerAttackRelease("1n"); 
        if (crashSub) crashSub.triggerAttackRelease("C1", "2n");
    }, 120);

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

    // Mostrar panel flotante 3D si estamos en Realidad Virtual (Frente a los ojos del jugador)
    if (renderer.xr.isPresenting && vrGameOverPanel) {
        vrGameOverPanel.userData.update('¡IMPACTO FATAL!', obstacleType === 'pedestrian' ? 'Atropello a peatón en cruce' : 'Colisión frontal contra vehículo', `${currentKmh} KM/H • ${reactionSeconds.split(' ')[0]}`);
        vrGameOverPanel.position.set(0, 0.05, -1.45);
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
        xrCameraRig.position.set(0, 0, 0);
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

            for (const source of session.inputSources) {
                if (source.gamepad) {
                    const gp = source.gamepad;
                    // Detectar botones
                    if (gp.buttons) {
                        // Botón Trigger (índice 0)
                        if (gp.buttons[0] && gp.buttons[0].pressed) triggerPressed = true;
                        // Botón Grip (índice 1 - botón de agarrar lateral)
                        if (gp.buttons[1] && gp.buttons[1].pressed) gripPressed = true;
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

                            // Mapear coordenada UV de impacto a las 5 opciones (de 1780px de altura)
                            if (hit.uv) {
                                const uvY = hit.uv.y; // 1.0 (arriba) a 0.0 (abajo)
                                // Item 0: y 310-480 -> uv 0.73 a 0.82
                                // Item 1: y 505-675 -> uv 0.62 a 0.71
                                // Item 2: y 700-870 -> uv 0.51 a 0.60
                                // Item 3: y 895-1065 -> uv 0.40 a 0.49
                                // Item 4 (Salir): y 1090-1260 -> uv 0.29 a 0.38
                                if (uvY >= 0.73 && uvY <= 0.84) rayPointedIdx = 0;
                                else if (uvY >= 0.62 && uvY < 0.73) rayPointedIdx = 1;
                                else if (uvY >= 0.51 && uvY < 0.62) rayPointedIdx = 2;
                                else if (uvY >= 0.40 && uvY < 0.51) rayPointedIdx = 3;
                                else if (uvY >= 0.28 && uvY < 0.40) rayPointedIdx = 4;
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
                    // Navegación con palanca física (5 opciones: 0 a 4)
                    if (stickYInput > 0.3) {
                        vrSelectedModeIdx = Math.min(4, vrSelectedModeIdx + 1);
                        vrMenuPanel.userData.render(vrSelectedModeIdx);
                        vrStickDebounce = now;
                    } else if (stickYInput < -0.3) {
                        vrSelectedModeIdx = Math.max(0, vrSelectedModeIdx - 1);
                        vrMenuPanel.userData.render(vrSelectedModeIdx);
                        vrStickDebounce = now;
                    }
                }

                // Iniciar juego, alternar volumen o salir de VR con Gatillo o Botón A/X
                if (triggerPressed || buttonPrimary) {
                    if (vrSelectedModeIdx === 3) {
                        if (now - vrStickDebounce > 280) {
                            // Alternar volumen en ciclos: 50% -> 75% -> 100% -> 25% -> 50%
                            let nextVol = currentVolume + 0.25;
                            if (nextVol > 1.05) nextVol = 0.25;
                            setMasterVolume(nextVol);
                            vrMenuPanel.userData.render(3);
                            vrStickDebounce = now;
                        }
                    } else if (vrSelectedModeIdx === 4) {
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
        // Dinámica de aceleración natural y freno progresivo
        if (isBraking) {
            // Frenado fuerte al mantener pulsado el botón de freno
            speedMultiplier = Math.max(0.1, speedMultiplier - 0.025);
            if (elBrakeIndicator) elBrakeIndicator.classList.remove('hidden');
        } else if (isDownDown) {
            speedMultiplier = Math.max(0.2, speedMultiplier - 0.008);
            if (elBrakeIndicator) elBrakeIndicator.classList.remove('hidden');
        } else {
            // Recuperación rápida de aceleración de crucero (hasta 70 - 90 km/h)
            if (speedMultiplier < 0.8) {
                speedMultiplier += 0.012; // Acelera rápido de vuelta a velocidad normal
            } else {
                speedMultiplier += 0.00015;
            }
            speedMultiplier = Math.min(speedMultiplier, 1.4);
            if (elBrakeIndicator) elBrakeIndicator.classList.add('hidden');
        }

        // Actualizar motor de audio realista
        updateEngineAudio(speedMultiplier, isBraking);

        score += speedMultiplier * 0.012;
        elScore.innerText = score.toFixed(1) + " km";

        let displaySpeed = Math.floor(speedMultiplier * 90);
        elSpeed.innerText = Math.max(15, displaySpeed);
        elRpmBar.style.width = `${((speedMultiplier - 0.15) / 1.25) * 100}%`;

        // Control lateral
        if (isLeftDown) targetX -= 0.19;
        if (isRightDown) targetX += 0.19;
        targetX = Math.max(-5.2, Math.min(5.2, targetX));

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
            // Mover el Rig VR exactamente con el asiento del piloto
            xrCameraRig.position.set(player.position.x - 0.5, 1.35, player.position.z + 0.1);
            if (cabin) cabin.visible = false;
            if (roof) roof.visible = false;
        } else if (cameraMode === 'fpv') {
            if (cabin) cabin.visible = false;
            if (roof) roof.visible = false;
            const headBob = currentMode === 'drunk' ? Math.sin(Date.now() * 0.002) * 0.05 : 0;
            camera.position.set(player.position.x - 0.5 + headBob, 1.45, player.position.z - 0.2);
            camera.rotation.set(
                -0.02,
                (targetX - player.position.x) * 0.04,
                currentMode === 'drunk' ? Math.sin(Date.now() * 0.0015) * 0.06 : (targetX - player.position.x) * 0.03
            );
        } else {
            if (cabin) cabin.visible = true;
            if (roof) roof.visible = true;
            camera.position.set(player.position.x * 0.8, 3.4, player.position.z + 6.2);
            camera.lookAt(player.position.x, 1.1, player.position.z - 15);
        }

        // Avance y reciclaje de la carretera (Sensación de velocidad constante)
        const moveDist = speedMultiplier * 1.8;
        roadChunks.forEach(chunk => {
            chunk.position.z += moveDist;

            if (chunk.userData.type === 'intersection') {
                const time = Date.now() * 0.001;
                const cycle = (time + chunk.position.z * 0.05) % 12;
                let state = (cycle > 6 && cycle <= 8) ? 1 : ((cycle > 8) ? 2 : 0);

                chunk.userData.trafficLights.forEach(tl => {
                    const ud = tl.userData;
                    ud.r.material.color.setHex(state === 2 ? 0xff0000 : 0x220000);
                    ud.y.material.color.setHex(state === 1 ? 0xffbb00 : 0x221100);
                    ud.g.material.color.setHex(state === 0 ? 0x00ff00 : 0x002200);
                });
            }

            if (chunk.position.z > chunkLength) {
                chunk.position.z -= roadChunks.length * chunkLength;
            }
        });

        // Obstáculos y Colisiones
        for (let i = obstacles.length - 1; i >= 0; i--) {
            let obs = obstacles[i];

            if (obs.userData.type === 'pedestrian') {
                obs.position.x += obs.userData.speedX;
                obs.position.z += moveDist;
                obs.userData.legs[0].rotation.x = Math.sin(Date.now() * 0.012) * 0.6;
                obs.userData.legs[1].rotation.x = -Math.sin(Date.now() * 0.012) * 0.6;
            } else {
                let relSpeed = (obs.position.x < -2) ? moveDist * 1.6 : moveDist * 0.5;
                obs.position.z += relSpeed;
            }

            const distZ = Math.abs(obs.position.z - player.position.z);
            const distX = Math.abs(obs.position.x - player.position.x);
            const widthLimit = obs.userData.type === 'pedestrian' ? 1.6 : 2.4;

            if (distZ < 2.8 && distX < widthLimit && obs.position.z < 1.0) {
                triggerGameOver(obs.userData.type);
            }

            if (obs.position.z > 15) {
                scene.remove(obs);
                obstacles.splice(i, 1);
                spawnObstacle();
            }
        }
    } else if (gameState === 'crashing') {
        if (!renderer.xr.isPresenting) {
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
