// ============================================================
// MODELOS Y ELEMENTOS DEL MUNDO (PISTA, CALLES, EDIFICIOS, AUTOS, PEATONES, UI 3D VR)
// ============================================================

// Materiales globales optimizados
const roadMat = new THREE.MeshLambertMaterial({ color: 0x1e293b });
const zebraMat = new THREE.MeshBasicMaterial({ color: 0xffffff });
const sidewalkMat = new THREE.MeshLambertMaterial({ color: 0x334155 });
const buildingMat = new THREE.MeshLambertMaterial({ color: 0x1e293b });

const trafficColors = [0xdc2626, 0xf59e0b, 0x10b981, 0x8b5cf6, 0xf8fafc, 0x334155];

// Semáforo con postes y luces
function createTrafficLight() {
    const group = new THREE.Group();
    const pole = new THREE.Mesh(new THREE.CylinderGeometry(0.1, 0.1, 7.5, 6), new THREE.MeshLambertMaterial({ color: 0x475569 }));
    pole.position.y = 3.75;

    const box = new THREE.Mesh(new THREE.BoxGeometry(0.8, 2.4, 0.8), new THREE.MeshLambertMaterial({ color: 0x090d16 }));
    box.position.set(0, 6.8, 0.2);

    const rLight = new THREE.Mesh(new THREE.SphereGeometry(0.26, 6, 6), new THREE.MeshBasicMaterial({ color: 0x330000 }));
    rLight.position.set(0, 7.5, 0.62);
    const yLight = new THREE.Mesh(new THREE.SphereGeometry(0.26, 6, 6), new THREE.MeshBasicMaterial({ color: 0x332200 }));
    yLight.position.set(0, 6.8, 0.62);
    const gLight = new THREE.Mesh(new THREE.SphereGeometry(0.26, 6, 6), new THREE.MeshBasicMaterial({ color: 0x003300 }));
    gLight.position.set(0, 6.1, 0.62);

    group.add(pole, box, rLight, yLight, gLight);
    group.userData = { r: rLight, y: yLight, g: gLight };
    return group;
}

// Edificios laterales con ventanas
function createBuilding(isLeft) {
    const group = new THREE.Group();
    const height = 15 + Math.random() * 20;
    const width = 8 + Math.random() * 6;
    const depth = 25 + Math.random() * 10;
    
    const bMesh = new THREE.Mesh(new THREE.BoxGeometry(width, height, depth), buildingMat);
    bMesh.position.set(isLeft ? -19 - width / 2 : 19 + width / 2, height / 2, 0);
    group.add(bMesh);

    const winGeo = new THREE.PlaneGeometry(0.8, 1.2);
    const winMatOn = new THREE.MeshBasicMaterial({ color: 0xfde047 });
    for (let w = 0; w < 4; w++) {
        const win = new THREE.Mesh(winGeo, winMatOn);
        win.position.set(
            isLeft ? -19 : 19,
            3 + Math.random() * (height - 6),
            (Math.random() - 0.5) * depth * 0.8
        );
        win.rotation.y = isLeft ? Math.PI / 2 : -Math.PI / 2;
        group.add(win);
    }
    return group;
}

// Generar un bloque de pista con líneas continuas/discontinuas y árboles/farolas
function createRoadChunk(index, chunkLength) {
    const chunk = new THREE.Group();
    const isIntersection = (index % 3 === 0 && index !== 0);

    // Asfalto
    const ground = new THREE.Mesh(new THREE.PlaneGeometry(22, chunkLength), roadMat);
    ground.rotation.x = -Math.PI / 2;
    chunk.add(ground);

    // Veredas
    const swLeft = new THREE.Mesh(new THREE.BoxGeometry(4, 0.35, chunkLength), sidewalkMat);
    swLeft.position.set(-13, 0.17, 0);
    const swRight = new THREE.Mesh(new THREE.BoxGeometry(4, 0.35, chunkLength), sidewalkMat);
    swRight.position.set(13, 0.17, 0);
    chunk.add(swLeft, swRight);

    // Edificios a los lados
    chunk.add(createBuilding(true));
    chunk.add(createBuilding(false));

    // Marcas viales (Líneas divisorias cada 8 metros)
    for (let zOffset = -chunkLength / 2 + 4; zOffset < chunkLength / 2; zOffset += 8) {
        const lineL = new THREE.Mesh(new THREE.PlaneGeometry(0.25, 4.5), zebraMat);
        lineL.rotation.x = -Math.PI / 2;
        lineL.position.set(-3.5, 0.02, zOffset);
        chunk.add(lineL);

        const lineR = new THREE.Mesh(new THREE.PlaneGeometry(0.25, 4.5), zebraMat);
        lineR.rotation.x = -Math.PI / 2;
        lineR.position.set(3.5, 0.02, zOffset);
        chunk.add(lineR);
    }

    if (isIntersection) {
        // Cruce peatonal (Paso de cebra)
        for (let j = -4; j <= 4; j++) {
            const stripe = new THREE.Mesh(new THREE.PlaneGeometry(0.9, 5.5), zebraMat);
            stripe.rotation.x = -Math.PI / 2;
            stripe.position.set(j * 1.8, 0.03, 0);
            chunk.add(stripe);
        }

        // Semáforos
        const tlLeft = createTrafficLight();
        tlLeft.position.set(-10.5, 0, -2);
        tlLeft.rotation.y = Math.PI / 6;
        const tlRight = createTrafficLight();
        tlRight.position.set(10.5, 0, -2);
        tlRight.rotation.y = -Math.PI / 6;
        chunk.add(tlLeft, tlRight);

        chunk.userData = { type: 'intersection', trafficLights: [tlLeft, tlRight] };
    } else {
        // Farola de alumbrado público
        const pole = new THREE.Mesh(new THREE.CylinderGeometry(0.12, 0.12, 8.5, 6), new THREE.MeshLambertMaterial({ color: 0x475569 }));
        pole.position.set(-10.5, 4.25, 0);

        const arm = new THREE.Mesh(new THREE.BoxGeometry(2.2, 0.15, 0.15), new THREE.MeshLambertMaterial({ color: 0x475569 }));
        arm.position.set(-9.5, 8.4, 0);

        const bulb = new THREE.Mesh(new THREE.SphereGeometry(0.35, 8, 8), new THREE.MeshBasicMaterial({ color: 0xffedd5 }));
        bulb.position.set(-8.5, 8.2, 0);

        chunk.add(pole, arm, bulb);
        chunk.userData = { type: 'straight' };
    }

    // Árbol decorativo en la vereda derecha para referencia de velocidad
    const treeGroup = new THREE.Group();
    const trunk = new THREE.Mesh(new THREE.CylinderGeometry(0.2, 0.25, 3, 6), new THREE.MeshLambertMaterial({ color: 0x5c4033 }));
    trunk.position.y = 1.5;
    const foliage = new THREE.Mesh(new THREE.DodecahedronGeometry(1.4), new THREE.MeshLambertMaterial({ color: 0x16a34a }));
    foliage.position.y = 3.6;
    treeGroup.add(trunk, foliage);
    treeGroup.position.set(12, 0, 10);
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

    const planeGeo = new THREE.PlaneGeometry(2.8, 1.65);
    const planeMat = new THREE.MeshBasicMaterial({ map: texture, transparent: true, side: THREE.DoubleSide });
    const mesh = new THREE.Mesh(planeGeo, planeMat);
    mesh.userData = { canvas, ctx, texture, update };
    return mesh;
}

// Menú Flotante 3D para seleccionar modo en VR (Ultra Alta Definición 2048x1680)
function createVRMenuPanel() {
    const canvas = document.createElement('canvas');
    canvas.width = 2048;
    canvas.height = 1680;
    const ctx = canvas.getContext('2d');
    let texture = null;

    function render(selectedIdx) {
        ctx.fillStyle = 'rgba(8, 12, 26, 0.98)';
        ctx.fillRect(0, 0, 2048, 1680);

        ctx.strokeStyle = '#38bdf8';
        ctx.lineWidth = 18;
        ctx.strokeRect(18, 18, 2012, 1644);

        // Badge Educleta
        ctx.fillStyle = 'rgba(239, 68, 68, 0.2)';
        ctx.fillRect(780, 50, 488, 64);
        ctx.strokeStyle = '#ef4444';
        ctx.lineWidth = 4;
        ctx.strokeRect(780, 50, 488, 64);
        ctx.fillStyle = '#f87171';
        ctx.font = 'bold 36px sans-serif';
        ctx.textAlign = 'center';
        ctx.fillText('ONG EDUCLETA', 1024, 96);

        // Título Principal
        ctx.fillStyle = '#ffffff';
        ctx.font = '900 92px sans-serif';
        ctx.fillText('METAVERSO VIAL VR', 1024, 210);

        ctx.fillStyle = '#94a3b8';
        ctx.font = 'bold 44px sans-serif';
        ctx.fillText('Apunta con el láser azul y presiona Gatillo para elegir', 1024, 290);

        const currentVolPercent = Math.round(currentVolume * 100);
        const modes = [
            { title: '1. Conducción Atenta (100% Lúcido)', sub: 'Reflejos normales y control al 100%', color: '#2563eb', border: '#60a5fa' },
            { title: '2. Bajo Efectos del Alcohol 🍺', sub: 'Visión en túnel, retardo neuromuscular y desvío', color: '#9333ea', border: '#c084fc' },
            { title: '3. Conducción Distraída (Celular) 📱', sub: 'Ceguera inatencional por mensajes de WhatsApp', color: '#d97706', border: '#fbbf24' },
            { title: `🔊 Volumen de Audio: ${currentVolPercent}%`, sub: 'Toca con el láser para alternar el nivel de sonido', color: '#0284c7', border: '#38bdf8' }
        ];

        modes.forEach((m, idx) => {
            const y = 350 + idx * 215;
            const isSel = (selectedIdx === idx);

            // Fondo del botón
            ctx.fillStyle = isSel ? m.color : 'rgba(30, 41, 59, 0.9)';
            ctx.fillRect(100, y, 1848, 185);

            // Borde brillante e indicador de puntero si está seleccionado
            ctx.strokeStyle = isSel ? '#38bdf8' : '#475569';
            ctx.lineWidth = isSel ? 10 : 4;
            ctx.strokeRect(100, y, 1848, 185);

            if (isSel) {
                // Flechas grandes llamativas
                ctx.fillStyle = '#ffffff';
                ctx.font = 'bold 74px sans-serif';
                ctx.textAlign = 'left';
                ctx.fillText('👉', 130, y + 115);
                ctx.textAlign = 'right';
                ctx.fillText('👈', 1918, y + 115);
            }

            ctx.textAlign = 'center';
            ctx.fillStyle = '#ffffff';
            ctx.font = isSel ? '900 58px sans-serif' : 'bold 52px sans-serif';
            ctx.fillText(m.title, 1024, y + 80);

            ctx.fillStyle = isSel ? '#e2e8f0' : '#94a3b8';
            ctx.font = 'bold 36px sans-serif';
            ctx.fillText(m.sub, 1024, y + 140);
        });

        // Caja de ayuda con los controles en las gafas
        ctx.fillStyle = 'rgba(15, 23, 42, 0.96)';
        ctx.fillRect(100, 1240, 1848, 380);
        ctx.strokeStyle = '#38bdf8';
        ctx.lineWidth = 6;
        ctx.strokeRect(100, 1240, 1848, 380);

        ctx.fillStyle = '#38bdf8';
        ctx.font = 'bold 50px sans-serif';
        ctx.fillText('🕹️ GUÍA DE CONTROLES EN META QUEST:', 1024, 1315);

        ctx.fillStyle = '#e2e8f0';
        ctx.font = 'bold 40px sans-serif';
        ctx.fillText('• Apuntar Láser y Gatillo: Elegir opción / Entrar', 1024, 1385);
        ctx.fillText('• Botón Grip (Lateral) o Botón A: Freno de mano (STOP)', 1024, 1455);
        ctx.fillText('• Botón B / Y / Menú: Volver al menú en cualquier momento', 1024, 1525);
        ctx.fillText('• Soltar Freno: El vehículo recupera aceleración normal', 1024, 1585);

        if (texture) texture.needsUpdate = true;
    }

    texture = new THREE.CanvasTexture(canvas);
    texture.minFilter = THREE.LinearMipmapLinearFilter;
    texture.magFilter = THREE.LinearFilter;
    texture.generateMipmaps = true;

    render(0);

    const planeGeo = new THREE.PlaneGeometry(2.4, 1.95);
    const planeMat = new THREE.MeshBasicMaterial({ map: texture, transparent: true, side: THREE.DoubleSide });
    const mesh = new THREE.Mesh(planeGeo, planeMat);
    mesh.userData = { canvas, ctx, texture, render, selectedIdx: 0 };
    return mesh;
}
