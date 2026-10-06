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

// Panel 3D Flotante de Game Over dentro de VR
const vrPanel = createVRPanel('¡IMPACTO FATAL!', 'Presiona cualquier botón para reiniciar', '🔄 REINICIAR PARTIDA');
vrPanel.position.set(0, 1.4, -2.5);
vrPanel.visible = false;
scene.add(vrPanel);

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
    elCamLabel.innerText = (cameraMode === 'fpv') ? 'Cámara: 1ra Persona' : 'Cámara: 3ra Persona';
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
            
            if (gameState === 'menu') {
                startGame('normal');
            }

            session.addEventListener('end', () => {
                isVRActive = false;
                vrSession = null;
                document.getElementById('vr-btn-label').innerText = '🥽 Entrar en VR (Meta Quest)';
            });
        } catch (err) {
            console.error("No se pudo iniciar la sesión VR:", err);
            toggleQuestModal(true);
        }
    } else if (vrSession) {
        vrSession.end();
    }
}

// Iniciar Partida
function startGame(mode) {
    initAudio();

    currentMode = mode;
    gameState = 'playing';
    score = 0;
    targetX = 0;
    speedMultiplier = 0.6;

    player.position.set(0, 0, 0);
    player.rotation.set(0, 0, 0);
    wheelGroup.rotation.z = 0;

    obstacles.forEach(o => scene.remove(o));
    obstacles.length = 0;

    elMainMenu.classList.add('menu-hidden');
    elMainMenu.classList.remove('menu-visible');
    elGameOver.classList.add('menu-hidden');
    elGameOver.classList.remove('menu-visible');
    elHud.classList.remove('opacity-0');
    elCamToggle.classList.remove('hidden');

    if (elMobileControls) elMobileControls.classList.remove('hidden');

    elCanvas.className = '';
    clearInterval(distractionInterval);
    elDistraction.classList.add('hidden');
    isDistractionActive = false;

    if (engineNoise) {
        engineNoise.volume.rampTo(-12, 1);
    }

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
        if (engineFilter) engineFilter.frequency.value = 160;
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

    if (engineNoise) engineNoise.volume.rampTo(-Infinity, 0.1);
    if (skidSynth) skidSynth.triggerAttackRelease("4n");
    setTimeout(() => { if (crashSynth) crashSynth.triggerAttackRelease("1n"); }, 180);

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

    // Mostrar panel flotante 3D si estamos en Realidad Virtual
    if (renderer.xr.isPresenting && vrPanel) {
        vrPanel.position.set(player.position.x - 0.5, 1.4, player.position.z - 2.5);
        vrPanel.visible = true;
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
    if (elMobileControls) elMobileControls.classList.add('hidden');
    if (vrPanel) vrPanel.visible = false;
    elGameOver.classList.add('menu-hidden');
    elGameOver.classList.add('hidden');
    elMainMenu.classList.remove('menu-hidden');
    elMainMenu.classList.remove('hidden', 'opacity-0', 'pointer-events-none');
    elMainMenu.classList.add('menu-visible');
    player.position.set(0, 0, 0);
    player.rotation.set(0, 0, 0);
    
    if (renderer.xr.isPresenting) {
        xrCameraRig.position.set(0, 0, 0);
        // Si está en VR, reiniciar directamente la carrera
        startGame('normal');
    } else {
        camera.position.set(0, 2.5, 7.0);
        camera.lookAt(0, 1.0, -10);
    }

    if (cabin) cabin.visible = true;
    if (roof) roof.visible = true;
}

// Bucle de Animación y Física
function animate() {
    // Lectura de mandos Meta Quest en cualquier estado para reinicio / controles
    if (renderer.xr.isPresenting) {
        const session = renderer.xr.getSession();
        if (session && session.inputSources) {
            for (const source of session.inputSources) {
                if (source.gamepad) {
                    const gp = source.gamepad;
                    // En Game Over o Menú: presionar cualquier botón (Gatillo, Botón A/B/X/Y) reinicia la partida
                    if (gameState === 'gameover' || gameState === 'crashing' || gameState === 'menu') {
                        if (gp.buttons && gp.buttons.some(b => b && b.pressed)) {
                            resetGame();
                            return;
                        }
                    }

                    // En partida: joystick para dirección y gatillo para frenar
                    if (gameState === 'playing') {
                        if (gp.axes && gp.axes.length >= 2) {
                            const stickX = gp.axes[2] || gp.axes[0] || 0;
                            if (Math.abs(stickX) > 0.12) {
                                targetX += stickX * 0.22;
                            }
                        }
                        // Botón A/X o Gatillo para frenar
                        if (gp.buttons && gp.buttons[0] && gp.buttons[0].pressed) {
                            isBraking = true;
                        }
                        // Botón B/Y o Grip para desacelerar
                        if (gp.buttons && gp.buttons[1] && gp.buttons[1].pressed) {
                            isDownDown = true;
                        }
                    }
                }
            }
        }
    }

    if (gameState === 'playing') {
        // Dinámica de aceleración y freno
        if (isBraking) {
            speedMultiplier = Math.max(0.15, speedMultiplier - 0.015);
            if (elBrakeIndicator) elBrakeIndicator.classList.remove('hidden');
            if (skidSynth && Math.random() > 0.85) {
                skidSynth.triggerAttackRelease("16n", undefined, 0.3);
            }
        } else if (isDownDown) {
            speedMultiplier = Math.max(0.2, speedMultiplier - 0.005);
            if (elBrakeIndicator) elBrakeIndicator.classList.remove('hidden');
        } else {
            speedMultiplier += 0.00015;
            speedMultiplier = Math.min(speedMultiplier, 1.4);
            if (elBrakeIndicator) elBrakeIndicator.classList.add('hidden');
        }

        score += speedMultiplier * 0.012;
        elScore.innerText = score.toFixed(1) + " km";

        let displaySpeed = Math.floor(speedMultiplier * 90);
        elSpeed.innerText = Math.max(15, displaySpeed);
        elRpmBar.style.width = `${((speedMultiplier - 0.15) / 1.25) * 100}%`;

        if (engineFilter) {
            engineFilter.frequency.value = 180 + (speedMultiplier * 950);
        }

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
