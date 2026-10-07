// ============================================================
// MODELOS Y ELEMENTOS DEL MUNDO (PISTA, CALLES, EDIFICIOS, AUTOS, PEATONES, UI 3D VR)
// ============================================================

// Materiales globales optimizados
const roadMat = new THREE.MeshLambertMaterial({ color: 0x1e293b });
const zebraMat = new THREE.MeshBasicMaterial({ color: 0xffffff });
const yellowLineMat = new THREE.MeshBasicMaterial({ color: 0xfacc15 }); // Doble línea central amarilla
const sidewalkMat = new THREE.MeshLambertMaterial({ color: 0x334155 });
const buildingMat = new THREE.MeshLambertMaterial({ color: 0x1e293b });

const trafficColors = [0xdc2626, 0xf59e0b, 0x10b981, 0x8b5cf6, 0xf8fafc, 0x334155];

// Semáforo con postes y luces (Orientado de frente mirando al conductor que viene acercándose por Z positiva)
function createTrafficLight() {
    const group = new THREE.Group();
    const pole = new THREE.Mesh(new THREE.CylinderGeometry(0.12, 0.12, 7.5, 6), new THREE.MeshLambertMaterial({ color: 0x475569 }));
    pole.position.y = 3.75;

    // Caja orientada hacia el jugador (las luces se ubican en la cara frontal mirando hacia Z positiva)
    const box = new THREE.Mesh(new THREE.BoxGeometry(0.85, 2.4, 0.8), new THREE.MeshLambertMaterial({ color: 0x090d16 }));
    box.position.set(0, 6.8, 0);

    // Las esferas se colocan en z = -0.42 (cara frontal del semáforo)
    const rLight = new THREE.Mesh(new THREE.SphereGeometry(0.26, 8, 8), new THREE.MeshBasicMaterial({ color: 0x330000 }));
    rLight.position.set(0, 7.5, -0.42);
    const yLight = new THREE.Mesh(new THREE.SphereGeometry(0.26, 8, 8), new THREE.MeshBasicMaterial({ color: 0x332200 }));
    yLight.position.set(0, 6.8, -0.42);
    const gLight = new THREE.Mesh(new THREE.SphereGeometry(0.26, 8, 8), new THREE.MeshBasicMaterial({ color: 0x003300 }));
    gLight.position.set(0, 6.1, -0.42);

    group.add(pole, box, rLight, yLight, gLight);
    group.userData = { r: rLight, y: yLight, g: gLight };
    return group;
}

// Señal Vertical de Tránsito: Velocidad Máxima 50 km/h (Reglamentaria Chilena / Internacional)
function createSpeedLimitSign() {
    const group = new THREE.Group();

    // Poste metálico
    const pole = new THREE.Mesh(
        new THREE.CylinderGeometry(0.08, 0.08, 4.2, 8),
        new THREE.MeshLambertMaterial({ color: 0x64748b })
    );
    pole.position.y = 2.1;
    group.add(pole);

    // Disco reglamentario con textura de 50 KM/H
    const signCanvas = document.createElement('canvas');
    signCanvas.width = 256;
    signCanvas.height = 256;
    const sCtx = signCanvas.getContext('2d');

    // Fondo blanco con borde circular rojo reglamentario
    sCtx.fillStyle = '#ffffff';
    sCtx.beginPath();
    sCtx.arc(128, 128, 120, 0, Math.PI * 2);
    sCtx.fill();

    sCtx.strokeStyle = '#dc2626';
    sCtx.lineWidth = 26;
    sCtx.stroke();

    // Número 50
    sCtx.fillStyle = '#0f172a';
    sCtx.font = '900 110px sans-serif';
    sCtx.textAlign = 'center';
    sCtx.fillText('50', 128, 155);

    // Texto inferior "MÁX"
    sCtx.font = 'bold 22px sans-serif';
    sCtx.fillStyle = '#475569';
    sCtx.fillText('MÁX', 128, 195);

    const signTexture = new THREE.CanvasTexture(signCanvas);
    const signGeo = new THREE.CylinderGeometry(0.7, 0.7, 0.04, 24);
    const signMat = new THREE.MeshBasicMaterial({ map: signTexture });
    const signDisc = new THREE.Mesh(signGeo, signMat);
    signDisc.rotation.x = Math.PI / 2;
    signDisc.rotation.z = Math.PI; // Mirando hacia el jugador
    signDisc.position.set(0, 3.2, 0);
    group.add(signDisc);

    return group;
}

// Panel Flotante 3D de Infracción / Advertencia en VR (Luz Roja / Velocidad)
function createVRInfractionPanel() {
    const canvas = document.createElement('canvas');
    canvas.width = 1536;
    canvas.height = 512;
    const ctx = canvas.getContext('2d');
    let texture = null;

    function show(title, desc, subdesc) {
        ctx.fillStyle = 'rgba(15, 23, 42, 0.96)';
        ctx.fillRect(0, 0, 1536, 512);

        ctx.strokeStyle = '#ef4444';
        ctx.lineWidth = 14;
        ctx.strokeRect(10, 10, 1516, 492);

        // Header Rojo
        ctx.fillStyle = '#ef4444';
        ctx.fillRect(20, 20, 1496, 120);

        ctx.fillStyle = '#ffffff';
        ctx.font = 'bold 72px sans-serif';
        ctx.textAlign = 'center';
        ctx.fillText(title || '⚠️ INFRACCIÓN GRAVE', 768, 105);

        ctx.fillStyle = '#f8fafc';
        ctx.font = 'bold 46px sans-serif';
        ctx.fillText(desc || '¡Infracción a las Normas del Tránsito!', 768, 245);

        ctx.fillStyle = '#94a3b8';
        ctx.font = '36px sans-serif';
        ctx.fillText(subdesc || 'Respeta la Ley de Tránsito y conduce a la defensiva.', 768, 330);

        ctx.fillStyle = '#f87171';
        ctx.font = 'bold 32px sans-serif';
        ctx.fillText('• En zona urbana la velocidad máxima es de 50 km/h •', 768, 430);

        if (texture) texture.needsUpdate = true;
    }

    texture = new THREE.CanvasTexture(canvas);
    texture.minFilter = THREE.LinearMipmapLinearFilter;
    texture.magFilter = THREE.LinearFilter;
    texture.generateMipmaps = true;

    show('⚠️ SEMÁFORO EN ROJO', '¡Infracción Gravísima! Pasaste con luz roja.');

    const planeGeo = new THREE.PlaneGeometry(1.6, 0.55);
    const planeMat = new THREE.MeshBasicMaterial({ map: texture, transparent: true, side: THREE.DoubleSide });
    const mesh = new THREE.Mesh(planeGeo, planeMat);
    mesh.userData = { canvas, ctx, texture, show };
    return mesh;
}

// Edificios laterales con ventanas
function createBuilding(isLeft) {
    const group = new THREE.Group();
    const height = 18 + Math.random() * 22;
    const width = 10 + Math.random() * 6;
    const depth = 28 + Math.random() * 10;
    
    const bMesh = new THREE.Mesh(new THREE.BoxGeometry(width, height, depth), buildingMat);
    bMesh.position.set(isLeft ? -20 - width / 2 : 20 + width / 2, height / 2, 0);
    group.add(bMesh);

    const winGeo = new THREE.PlaneGeometry(0.8, 1.2);
    const winMatOn = new THREE.MeshBasicMaterial({ color: 0xfde047 });
    for (let w = 0; w < 4; w++) {
        const win = new THREE.Mesh(winGeo, winMatOn);
        win.position.set(
            isLeft ? -20 : 20,
            3 + Math.random() * (height - 6),
            (Math.random() - 0.5) * depth * 0.8
        );
        win.rotation.y = isLeft ? Math.PI / 2 : -Math.PI / 2;
        group.add(win);
    }
    return group;
}

// Generar un bloque de avenida de 4 Pistas (2 por sentido)
function createRoadChunk(index, chunkLength) {
    const chunk = new THREE.Group();
    const isIntersection = (index % 3 === 0 && index !== 0);

    // Asfalto amplio (26 metros de ancho para 4 pistas holgadas + bermas)
    const ground = new THREE.Mesh(new THREE.PlaneGeometry(26, chunkLength), roadMat);
    ground.rotation.x = -Math.PI / 2;
    chunk.add(ground);

    // Veredas peatonales
    const swLeft = new THREE.Mesh(new THREE.BoxGeometry(4.5, 0.35, chunkLength), sidewalkMat);
    swLeft.position.set(-15.25, 0.17, 0);
    const swRight = new THREE.Mesh(new THREE.BoxGeometry(4.5, 0.35, chunkLength), sidewalkMat);
    swRight.position.set(15.25, 0.17, 0);
    chunk.add(swLeft, swRight);

    // Edificios a los lados
    chunk.add(createBuilding(true));
    chunk.add(createBuilding(false));

    // Marcas viales para las 4 Pistas:
    // Pista 1 (Contraflujo externa): X ≈ -8.0
    // Pista 2 (Contraflujo interna): X ≈ -2.7
    // [ EJE CENTRAL X = 0: Doble Línea Amarilla Continua ]
    // Pista 3 (Mismo sentido interna): X ≈ +2.7
    // Pista 4 (Mismo sentido externa): X ≈ +8.0

    // Doble línea continua amarilla en el eje central (X = -0.22 y X = +0.22)
    const doubleLineL = new THREE.Mesh(new THREE.PlaneGeometry(0.2, chunkLength), yellowLineMat);
    doubleLineL.rotation.x = -Math.PI / 2;
    doubleLineL.position.set(-0.25, 0.02, 0);
    const doubleLineR = new THREE.Mesh(new THREE.PlaneGeometry(0.2, chunkLength), yellowLineMat);
    doubleLineR.rotation.x = -Math.PI / 2;
    doubleLineR.position.set(0.25, 0.02, 0);
    chunk.add(doubleLineL, doubleLineR);

    // Líneas divisorias discontinuas blancas entre carriles del mismo sentido (cada 8 metros)
    for (let zOffset = -chunkLength / 2 + 4; zOffset < chunkLength / 2; zOffset += 8) {
        // Línea divisoria izquierda (entre Pista 1 y Pista 2) en X = -5.4
        const lineDivL = new THREE.Mesh(new THREE.PlaneGeometry(0.25, 4.5), zebraMat);
        lineDivL.rotation.x = -Math.PI / 2;
        lineDivL.position.set(-5.4, 0.02, zOffset);
        chunk.add(lineDivL);

        // Línea divisoria derecha (entre Pista 3 y Pista 4) en X = +5.4
        const lineDivR = new THREE.Mesh(new THREE.PlaneGeometry(0.25, 4.5), zebraMat);
        lineDivR.rotation.x = -Math.PI / 2;
        lineDivR.position.set(5.4, 0.02, zOffset);
        chunk.add(lineDivR);
    }

    if (isIntersection) {
        // Cruce peatonal (Paso de cebra completo en las 4 pistas)
        for (let j = -6; j <= 6; j++) {
            const stripe = new THREE.Mesh(new THREE.PlaneGeometry(1.0, 6.0), zebraMat);
            stripe.rotation.x = -Math.PI / 2;
            stripe.position.set(j * 1.85, 0.03, 0);
            chunk.add(stripe);
        }

        // Semáforo izquierdo: Regula a los vehículos del contraflujo (mirando hacia Z negativa, rotación 0)
        const tlLeft = createTrafficLight();
        tlLeft.position.set(-13.0, 0, 3.5);
        tlLeft.rotation.y = 0; // Invertido, mirando de frente hacia el tráfico contrario
        
        // Semáforo derecho: Regula al jugador y vehículos de su mismo sentido (mirando hacia Z positiva, rotación Math.PI)
        const tlRight = createTrafficLight();
        tlRight.position.set(13.0, 0, -3.5);
        tlRight.rotation.y = Math.PI; // De frente mirando hacia el jugador
        
        chunk.add(tlLeft, tlRight);
        chunk.userData = { type: 'intersection', trafficLights: [tlLeft, tlRight] };
    } else {
        // Farola de alumbrado público
        const pole = new THREE.Mesh(new THREE.CylinderGeometry(0.12, 0.12, 9.0, 6), new THREE.MeshLambertMaterial({ color: 0x475569 }));
        pole.position.set(-13.0, 4.5, 0);

        const arm = new THREE.Mesh(new THREE.BoxGeometry(2.5, 0.15, 0.15), new THREE.MeshLambertMaterial({ color: 0x475569 }));
        arm.position.set(-11.8, 8.8, 0);

        const bulb = new THREE.Mesh(new THREE.SphereGeometry(0.35, 8, 8), new THREE.MeshBasicMaterial({ color: 0xffedd5 }));
        bulb.position.set(-10.6, 8.6, 0);

        chunk.add(pole, arm, bulb);

        // Añadir Señal Reglamentaria de Velocidad Máxima 50 km/h en la vereda derecha
        if (index % 2 === 1) {
            const speedSign = createSpeedLimitSign();
            speedSign.position.set(13.2, 0, -5);
            chunk.add(speedSign);
        }

        chunk.userData = { type: 'straight' };
    }

    // Árbol decorativo en la vereda derecha para referencia de velocidad
    const treeGroup = new THREE.Group();
    const trunk = new THREE.Mesh(new THREE.CylinderGeometry(0.25, 0.3, 3.2, 6), new THREE.MeshLambertMaterial({ color: 0x5c4033 }));
    trunk.position.y = 1.6;
    const foliage = new THREE.Mesh(new THREE.DodecahedronGeometry(1.6), new THREE.MeshLambertMaterial({ color: 0x16a34a }));
    foliage.position.y = 3.8;
    treeGroup.add(trunk, foliage);
    treeGroup.position.set(14.5, 0, 10);
    chunk.add(treeGroup);

    return chunk;
}

// Crear Vehículo de Tráfico
function createTrafficCar(colorHex) {
    const car = new THREE.Group();
    const bodyMat = new THREE.MeshLambertMaterial({ color: colorHex });
    const windowMat = new THREE.MeshLambertMaterial({ color: 0x38bdf8, transparent: true, opacity: 0.6 });

    const chassis = new THREE.Mesh(new THREE.BoxGeometry(2.2, 0.65, 4.2), bodyMat);
    chassis.position.y = 0.55;
    car.add(chassis);

    const cabin = new THREE.Mesh(new THREE.BoxGeometry(1.8, 0.6, 2.3), windowMat);
    cabin.position.set(0, 1.15, -0.15);
    car.add(cabin);

    // Faros traseros
    const tailGeo = new THREE.BoxGeometry(0.4, 0.18, 0.1);
    const tailMat = new THREE.MeshBasicMaterial({ color: 0xff0000 });
    const tailL = new THREE.Mesh(tailGeo, tailMat);
    tailL.position.set(-0.75, 0.65, 2.1);
    const tailR = new THREE.Mesh(tailGeo, tailMat);
    tailR.position.set(0.75, 0.65, 2.1);
    car.add(tailL, tailR);

    // Faros delanteros
    const headGeo = new THREE.BoxGeometry(0.4, 0.18, 0.1);
    const headMat = new THREE.MeshBasicMaterial({ color: 0xfffbeb });
    const headL = new THREE.Mesh(headGeo, headMat);
    headL.position.set(-0.75, 0.65, -2.1);
    const headR = new THREE.Mesh(headGeo, headMat);
    headR.position.set(0.75, 0.65, -2.1);
    car.add(headL, headR);

    // Ruedas
    const wheelGeo = new THREE.CylinderGeometry(0.38, 0.38, 0.28, 8);
    const wheelMat = new THREE.MeshLambertMaterial({ color: 0x0f172a });
    const wheelPositions = [[-1.05, 0.38, -1.3], [1.05, 0.38, -1.3], [-1.05, 0.38, 1.3], [1.05, 0.38, 1.3]];
    wheelPositions.forEach(pos => {
        const w = new THREE.Mesh(wheelGeo, wheelMat);
        w.rotation.z = Math.PI / 2;
        w.position.set(pos[0], pos[1], pos[2]);
        car.add(w);
    });

    car.userData = { type: 'car' };
    return car;
}

// Crear Peatón animado
function createPedestrian() {
    const group = new THREE.Group();
    
    const bodyGeo = new THREE.CylinderGeometry(0.28, 0.28, 1.1, 8);
    const bodyMat = new THREE.MeshBasicMaterial({ color: 0xfacc15 });
    const body = new THREE.Mesh(bodyGeo, bodyMat);
    body.position.y = 1.05;

    const head = new THREE.Mesh(new THREE.SphereGeometry(0.22, 8, 8), new THREE.MeshBasicMaterial({ color: 0xfde047 }));
    head.position.y = 1.8;

    const legGeo = new THREE.BoxGeometry(0.2, 0.55, 0.2);
    const legMat = new THREE.MeshLambertMaterial({ color: 0x1e293b });
    const legL = new THREE.Mesh(legGeo, legMat);
    legL.position.set(-0.12, 0.28, 0);
    const legR = new THREE.Mesh(legGeo, legMat);
    legR.position.set(0.12, 0.28, 0);

    group.add(body, head, legL, legR);
    group.userData = { type: 'pedestrian', speedX: 0, legs: [legL, legR] };
    return group;
}

// Panel Flotante 3D para Game Over dentro de VR (Ultra Alta Definición 2048x1200)
function createVRGameOverPanel() {
    const canvas = document.createElement('canvas');
    canvas.width = 2048;
    canvas.height = 1200;
    const ctx = canvas.getContext('2d');
    let texture = null;

    function update(title, desc, stats) {
        // Fondo translúcido con gradiente y blur visual
        ctx.fillStyle = 'rgba(8, 12, 24, 0.98)';
        ctx.fillRect(0, 0, 2048, 1200);
        
        ctx.strokeStyle = '#ef4444';
        ctx.lineWidth = 16;
        ctx.strokeRect(16, 16, 2016, 1168);

        // Header Alerta
        ctx.fillStyle = '#ef4444';
        ctx.font = 'bold 96px sans-serif';
        ctx.textAlign = 'center';
        ctx.fillText(title, 1024, 180);

        // Línea divisoria
        ctx.fillStyle = '#dc2626';
        ctx.fillRect(824, 220, 400, 8);

        // Descripción de causa del siniestro
        ctx.fillStyle = '#e2e8f0';
        ctx.font = 'bold 54px sans-serif';
        ctx.fillText(desc, 1024, 340);

        // Estadísticas clave de telemetría de impacto
        if (stats) {
            ctx.fillStyle = 'rgba(30, 41, 59, 0.95)';
            ctx.fillRect(160, 430, 1728, 220);
            ctx.strokeStyle = '#38bdf8';
            ctx.lineWidth = 6;
            ctx.strokeRect(160, 430, 1728, 220);

            ctx.fillStyle = '#38bdf8';
            ctx.font = 'bold 64px monospace';
            ctx.fillText(stats, 1024, 560);
        }

        // Botón de acción grande
        ctx.fillStyle = '#16a34a';
        ctx.fillRect(260, 740, 1528, 200);
        ctx.strokeStyle = '#4ade80';
        ctx.lineWidth = 8;
        ctx.strokeRect(260, 740, 1528, 200);

        ctx.fillStyle = '#ffffff';
        ctx.font = 'bold 68px sans-serif';
        ctx.fillText('🎮 PRESIONA GATILLO O BOTÓN A PARA REINTENTAR', 1024, 865);

        // Subtexto
        ctx.fillStyle = '#94a3b8';
        ctx.font = 'bold 44px sans-serif';
        ctx.fillText('O pulsa Botón B / Y para volver al Menú Principal', 1024, 1050);

        if (texture) texture.needsUpdate = true;
    }

    texture = new THREE.CanvasTexture(canvas);
    texture.minFilter = THREE.LinearMipmapLinearFilter;
    texture.magFilter = THREE.LinearFilter;
    texture.generateMipmaps = true;

    update('¡IMPACTO FATAL!', 'Colisión de tránsito vehicular', 'T. Reacción anulado');

    const planeGeo = new THREE.PlaneGeometry(1.8, 1.05);
    const planeMat = new THREE.MeshBasicMaterial({ map: texture, transparent: true, side: THREE.DoubleSide });
    const mesh = new THREE.Mesh(planeGeo, planeMat);
    mesh.userData = { canvas, ctx, texture, update };
    return mesh;
}

// Panel Flotante 3D para Smartphone / WhatsApp en Realidad Virtual (Ultra HD 1024x1024)
function createVRPhoneDistraction() {
    const canvas = document.createElement('canvas');
    canvas.width = 1024;
    canvas.height = 1024;
    const ctx = canvas.getContext('2d');
    let texture = null;

    function render(data) {
        const sender = data && data.sender ? data.sender : 'Mamá';
        const avatar = data && data.avatar ? data.avatar : '👩';
        const lines = (data && data.lines) ? data.lines : ['¿A qué hora llegas? 😡', '¡Mañana tienes que levantarte temprano!', '¡Respóndeme por favor!'];
        const btnAlign = data && data.btnAlign ? data.btnAlign : 'center';

        // Marco de teléfono redondeado
        ctx.fillStyle = '#0f172a';
        ctx.fillRect(0, 0, 1024, 1024);

        ctx.strokeStyle = '#38bdf8';
        ctx.lineWidth = 14;
        ctx.strokeRect(10, 10, 1004, 1004);

        // Header WhatsApp verde esmeralda
        ctx.fillStyle = '#075e54';
        ctx.fillRect(20, 20, 984, 220);

        // Avatar
        ctx.fillStyle = 'rgba(255, 255, 255, 0.2)';
        ctx.beginPath();
        ctx.arc(120, 130, 75, 0, Math.PI * 2);
        ctx.fill();
        ctx.fillStyle = '#ffffff';
        ctx.font = '80px sans-serif';
        ctx.textAlign = 'center';
        ctx.fillText(avatar, 120, 155);

        // Nombre y estado
        ctx.textAlign = 'left';
        ctx.font = 'bold 54px sans-serif';
        ctx.fillText(sender, 230, 120);

        ctx.fillStyle = '#6ee7b7';
        ctx.font = '36px sans-serif';
        ctx.fillText('● escribiendo mensaje...', 230, 175);

        // Cuerpo del mensaje (Burbuja blanca)
        ctx.fillStyle = '#ffffff';
        ctx.fillRect(60, 280, 904, 480);
        ctx.strokeStyle = '#e2e8f0';
        ctx.lineWidth = 4;
        ctx.strokeRect(60, 280, 904, 480);

        ctx.fillStyle = '#0f172a';
        ctx.textAlign = 'center';
        lines.forEach((line, i) => {
            ctx.font = (i === 0) ? 'bold 44px sans-serif' : '38px sans-serif';
            ctx.fillText(line, 512, 380 + (i * 70));
        });

        ctx.fillStyle = '#94a3b8';
        ctx.font = 'bold 30px monospace';
        ctx.fillText('19:42 • WhatsApp', 512, 700);

        // Botón rojo inferior para cerrar (Con posición variable)
        let btnX = 80;
        let btnW = 864;
        if (btnAlign === 'left') {
            btnX = 60;
            btnW = 600;
        } else if (btnAlign === 'right') {
            btnX = 364;
            btnW = 600;
        }

        ctx.fillStyle = '#ef4444';
        ctx.fillRect(btnX, 800, btnW, 160);
        ctx.strokeStyle = '#fca5a5';
        ctx.lineWidth = 6;
        ctx.strokeRect(btnX, 800, btnW, 160);

        ctx.fillStyle = '#ffffff';
        ctx.font = 'bold 44px sans-serif';
        ctx.textAlign = 'center';
        ctx.fillText('🚫 PRESIONA GATILLO PARA CERRAR', btnX + (btnW / 2), 900);

        if (texture) texture.needsUpdate = true;
    }

    texture = new THREE.CanvasTexture(canvas);
    texture.minFilter = THREE.LinearMipmapLinearFilter;
    texture.magFilter = THREE.LinearFilter;
    texture.generateMipmaps = true;

    render();

    const planeGeo = new THREE.PlaneGeometry(1.0, 1.0);
    const planeMat = new THREE.MeshBasicMaterial({ map: texture, transparent: true, side: THREE.DoubleSide });
    const mesh = new THREE.Mesh(planeGeo, planeMat);
    mesh.userData = { canvas, ctx, texture, render };
    return mesh;
}

// Menú Flotante 3D para seleccionar modo en VR (Ultra Alta Definición 2048x1920)
function createVRMenuPanel() {
    const canvas = document.createElement('canvas');
    canvas.width = 2048;
    canvas.height = 1920;
    const ctx = canvas.getContext('2d');
    let texture = null;

    function render(selectedIdx) {
        ctx.fillStyle = 'rgba(8, 12, 26, 0.98)';
        ctx.fillRect(0, 0, 2048, 1920);

        ctx.strokeStyle = '#38bdf8';
        ctx.lineWidth = 18;
        ctx.strokeRect(18, 18, 2012, 1884);

        // Badge Educleta
        ctx.fillStyle = 'rgba(239, 68, 68, 0.2)';
        ctx.fillRect(780, 40, 488, 55);
        ctx.strokeStyle = '#ef4444';
        ctx.lineWidth = 4;
        ctx.strokeRect(780, 40, 488, 55);
        ctx.fillStyle = '#f87171';
        ctx.font = 'bold 32px sans-serif';
        ctx.textAlign = 'center';
        ctx.fillText('ONG EDUCLETA', 1024, 78);

        // Título Principal
        ctx.fillStyle = '#ffffff';
        ctx.font = '900 82px sans-serif';
        ctx.fillText('METAVERSO VIAL VR', 1024, 175);

        ctx.fillStyle = '#94a3b8';
        ctx.font = 'bold 38px sans-serif';
        ctx.fillText('Apunta con el láser azul y presiona Gatillo para elegir', 1024, 235);

        const currentVolPercent = Math.round(currentVolume * 100);
        const camText = (cameraMode === 'fpv') ? '👁️ Vista: Dentro del Auto (Piloto)' : '🚗 Vista: Fuera del Auto (3ra Persona)';
        const modes = [
            { title: '1. Conducción Atenta (100% Lúcido)', sub: 'Reflejos normales y control al 100%', color: '#2563eb' },
            { title: '2. Bajo Efectos del Alcohol 🍺', sub: 'Visión en túnel, retardo neuromuscular y desvío', color: '#9333ea' },
            { title: '3. Conducción Distraída (Celular) 📱', sub: 'Ceguera inatencional por mensajes de WhatsApp', color: '#d97706' },
            { title: '🎯 Centrar Vista del Piloto (Auto-Reset)', sub: 'Recalibrar y bloquear cámara en el asiento del volante', color: '#0891b2' },
            { title: `🔊 Volumen de Audio: ${currentVolPercent}%`, sub: 'Toca con el láser para alternar nivel de sonido', color: '#0284c7' },
            { title: camText, sub: 'Alternar entre vista interior del habitáculo o vista exterior', color: '#059669' },
            { title: '🚪 SALIR DE REALIDAD VIRTUAL (VR)', sub: 'Cerrar la sesión inmersiva y volver al navegador', color: '#dc2626' }
        ];

        modes.forEach((m, idx) => {
            const y = 250 + idx * 155;
            const isSel = (selectedIdx === idx);

            // Fondo del botón
            ctx.fillStyle = isSel ? m.color : 'rgba(30, 41, 59, 0.9)';
            ctx.fillRect(100, y, 1848, 140);

            // Borde brillante e indicador de puntero si está seleccionado
            ctx.strokeStyle = isSel ? '#38bdf8' : '#475569';
            ctx.lineWidth = isSel ? 10 : 4;
            ctx.strokeRect(100, y, 1848, 140);

            if (isSel) {
                // Flechas grandes llamativas
                ctx.fillStyle = '#ffffff';
                ctx.font = 'bold 56px sans-serif';
                ctx.textAlign = 'left';
                ctx.fillText('👉', 130, y + 85);
                ctx.textAlign = 'right';
                ctx.fillText('👈', 1918, y + 85);
            }

            ctx.textAlign = 'center';
            ctx.fillStyle = '#ffffff';
            ctx.font = isSel ? '900 44px sans-serif' : 'bold 40px sans-serif';
            ctx.fillText(m.title, 1024, y + 56);

            ctx.fillStyle = isSel ? '#e2e8f0' : '#94a3b8';
            ctx.font = 'bold 27px sans-serif';
            ctx.fillText(m.sub, 1024, y + 104);
        });

        // Caja de ayuda con los controles en las gafas
        ctx.fillStyle = 'rgba(15, 23, 42, 0.96)';
        ctx.fillRect(100, 1370, 1848, 470);
        ctx.strokeStyle = '#38bdf8';
        ctx.lineWidth = 6;
        ctx.strokeRect(100, 1370, 1848, 470);

        ctx.fillStyle = '#38bdf8';
        ctx.font = 'bold 44px sans-serif';
        ctx.fillText('🕹️ GUÍA DE CONTROLES EN META QUEST:', 1024, 1435);

        ctx.fillStyle = '#e2e8f0';
        ctx.font = 'bold 34px sans-serif';
        ctx.fillText('• Pulsar Joystick (R3 / L3): ¡Centrar Vista al Volante en cualquier momento!', 1024, 1500);
        ctx.fillText('• Apuntar Láser y Gatillo: Elegir opción del menú', 1024, 1565);
        ctx.fillText('• Botón Grip o Botón A: Frenar vehículo (STOP)', 1024, 1630);
        ctx.fillText('• Botón B / Y: Volver al menú', 1024, 1695);
        ctx.fillText('• Notificación Celular: Presiona Gatillo para cerrar', 1024, 1760);

        if (texture) texture.needsUpdate = true;
    }

    texture = new THREE.CanvasTexture(canvas);
    texture.minFilter = THREE.LinearMipmapLinearFilter;
    texture.magFilter = THREE.LinearFilter;
    texture.generateMipmaps = true;

    render(0);

    const planeGeo = new THREE.PlaneGeometry(2.4, 2.25);
    const planeMat = new THREE.MeshBasicMaterial({ map: texture, transparent: true, side: THREE.DoubleSide });
    const mesh = new THREE.Mesh(planeGeo, planeMat);
    mesh.userData = { canvas, ctx, texture, render, selectedIdx: 0 };
    return mesh;
}
