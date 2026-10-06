// ============================================================
// VEHÍCULO DEL JUGADOR (FPV / TPV, VOLANTE, INSTRUMENTOS, RUEDAS)
// ============================================================

function createPlayerVehicle() {
    const player = new THREE.Group();

    const playerBodyMat = new THREE.MeshLambertMaterial({ color: 0x2563eb });
    const playerTrimMat = new THREE.MeshLambertMaterial({ color: 0x0f172a });
    const playerGlassMat = new THREE.MeshLambertMaterial({ color: 0x38bdf8, transparent: true, opacity: 0.6 });

    // 1. Chasis
    const chassis = new THREE.Mesh(new THREE.BoxGeometry(2.3, 0.65, 4.4), playerBodyMat);
    chassis.position.y = 0.55;
    player.add(chassis);

    // 2. Capó delantero y guardabarros visibles al mirar adelante
    const hoodGeo = new THREE.BoxGeometry(2.1, 0.28, 1.8);
    const hood = new THREE.Mesh(hoodGeo, playerBodyMat);
    hood.position.set(0, 0.78, -1.35);
    hood.rotation.x = 0.04;
    player.add(hood);

    // Limpiaparabrisas decorativos sobre la base del capó
    const wiperMat = new THREE.MeshBasicMaterial({ color: 0x0f172a });
    const wiperL = new THREE.Mesh(new THREE.BoxGeometry(0.45, 0.02, 0.03), wiperMat);
    wiperL.position.set(-0.4, 0.92, -0.75);
    wiperL.rotation.z = -0.15;
    const wiperR = new THREE.Mesh(new THREE.BoxGeometry(0.45, 0.02, 0.03), wiperMat);
    wiperR.position.set(0.35, 0.92, -0.75);
    wiperR.rotation.z = -0.15;
    player.add(wiperL, wiperR);

    // 3. Cabina / Techo / Vidrios exteriores
    const cabinGeo = new THREE.BoxGeometry(1.9, 0.65, 2.2);
    const cabin = new THREE.Mesh(cabinGeo, playerGlassMat);
    cabin.position.set(0, 1.25, 0.2);
    player.add(cabin);

    const roof = new THREE.Mesh(new THREE.BoxGeometry(1.8, 0.08, 1.6), playerBodyMat);
    roof.position.set(0, 1.58, 0.25);
    player.add(roof);

    // 4. Pilares A (Marcos laterales del parabrisas frontal visibles desde adentro)
    const pillarMat = new THREE.MeshLambertMaterial({ color: 0x1e293b });
    const pillarL = new THREE.Mesh(new THREE.BoxGeometry(0.08, 0.65, 0.08), pillarMat);
    pillarL.position.set(-0.88, 1.25, -0.65);
    pillarL.rotation.x = 0.45;
    pillarL.rotation.z = -0.15;

    const pillarR = new THREE.Mesh(new THREE.BoxGeometry(0.08, 0.65, 0.08), pillarMat);
    pillarR.position.set(0.88, 1.25, -0.65);
    pillarR.rotation.x = 0.45;
    pillarR.rotation.z = 0.15;
    player.add(pillarL, pillarR);

    // Marco superior del parabrisas
    const windshieldTop = new THREE.Mesh(new THREE.BoxGeometry(1.72, 0.06, 0.08), pillarMat);
    windshieldTop.position.set(0, 1.52, -0.5);
    player.add(windshieldTop);

    // 5. Tablero, consola central y puertas interiores
    const dashboard = new THREE.Mesh(new THREE.BoxGeometry(1.85, 0.38, 0.65), playerTrimMat);
    dashboard.position.set(0, 0.96, -0.65);
    player.add(dashboard);

    // Paneles de puertas laterales interiores
    const doorL = new THREE.Mesh(new THREE.BoxGeometry(0.08, 0.55, 1.5), playerTrimMat);
    doorL.position.set(-0.92, 0.95, 0.1);
    const doorR = new THREE.Mesh(new THREE.BoxGeometry(0.08, 0.55, 1.5), playerTrimMat);
    doorR.position.set(0.92, 0.95, 0.1);
    player.add(doorL, doorR);

    // Consola central y palanca de cambios
    const centerConsole = new THREE.Mesh(new THREE.BoxGeometry(0.28, 0.3, 0.85), playerTrimMat);
    centerConsole.position.set(0, 0.82, -0.1);
    const gearStick = new THREE.Mesh(new THREE.CylinderGeometry(0.02, 0.02, 0.14, 8), pillarMat);
    gearStick.position.set(0, 0.98, -0.2);
    player.add(centerConsole, gearStick);

    // Espejo retrovisor central interior
    const mirrorGeo = new THREE.BoxGeometry(0.35, 0.12, 0.04);
    const mirrorMat = new THREE.MeshBasicMaterial({ color: 0x94a3b8 });
    const mirror = new THREE.Mesh(mirrorGeo, mirrorMat);
    mirror.position.set(0, 1.44, -0.45);
    player.add(mirror);

    // Asientos
    const seatGeo = new THREE.BoxGeometry(0.55, 0.65, 0.55);
    const seatMat = new THREE.MeshLambertMaterial({ color: 0x1e293b });
    
    // Asiento del copiloto
    const passengerSeat = new THREE.Mesh(seatGeo, seatMat);
    passengerSeat.position.set(0.48, 0.82, 0.2);
    // Asiento del piloto
    const driverSeat = new THREE.Mesh(seatGeo, seatMat);
    driverSeat.position.set(-0.48, 0.82, 0.2);
    player.add(passengerSeat, driverSeat);

    // Pantalla de instrumentos / Velocímetro digital
    const cluster = new THREE.Mesh(new THREE.PlaneGeometry(0.42, 0.20), new THREE.MeshBasicMaterial({ color: 0x0284c7 }));
    cluster.position.set(-0.48, 1.05, -0.42);
    cluster.rotation.x = -Math.PI / 5;
    player.add(cluster);

    // 6. Volante 3D animado
    const wheelGroup = new THREE.Group();
    const wheelRim = new THREE.Mesh(new THREE.TorusGeometry(0.22, 0.03, 10, 20), playerTrimMat);
    const centerCap = new THREE.Mesh(new THREE.CylinderGeometry(0.06, 0.06, 0.03, 12), playerTrimMat);
    centerCap.rotation.x = Math.PI / 2;
    const spoke = new THREE.Mesh(new THREE.BoxGeometry(0.44, 0.03, 0.02), playerTrimMat);
    wheelGroup.add(wheelRim, centerCap, spoke);
    wheelGroup.position.set(-0.48, 1.02, -0.28);
    wheelGroup.rotation.x = -Math.PI / 5;
    player.add(wheelGroup);

    // 6. Ruedas
    const playerWheels = [];
    const pTireGeo = new THREE.CylinderGeometry(0.38, 0.38, 0.28, 10);
    const pTireMat = new THREE.MeshLambertMaterial({ color: 0x0f172a });
    const pRimGeo = new THREE.CylinderGeometry(0.22, 0.22, 0.3, 8);
    const pRimMat = new THREE.MeshLambertMaterial({ color: 0xe2e8f0 });
    const wheelCoords = [[-1.15, 0.38, -1.3], [1.15, 0.38, -1.3], [-1.15, 0.38, 1.3], [1.15, 0.38, 1.3]];
    wheelCoords.forEach(pos => {
        const wg = new THREE.Group();
        const tire = new THREE.Mesh(pTireGeo, pTireMat);
        tire.rotation.z = Math.PI / 2;
        const rim = new THREE.Mesh(pRimGeo, pRimMat);
        rim.rotation.z = Math.PI / 2;
        wg.add(tire, rim);
        wg.position.set(pos[0], pos[1], pos[2]);
        player.add(wg);
        playerWheels.push(wg);
    });

    // 7. Luces traseras
    const tailGeo = new THREE.BoxGeometry(0.45, 0.18, 0.1);
    const tailMat = new THREE.MeshBasicMaterial({ color: 0xff0000 });
    const tailL = new THREE.Mesh(tailGeo, tailMat);
    tailL.position.set(-0.8, 0.68, 2.2);
    const tailR = new THREE.Mesh(tailGeo, tailMat);
    tailR.position.set(0.8, 0.68, 2.2);
    player.add(tailL, tailR);

    // Faros delanteros
    const headGeo = new THREE.BoxGeometry(0.45, 0.18, 0.1);
    const headMat = new THREE.MeshBasicMaterial({ color: 0xfffbeb });
    const headL = new THREE.Mesh(headGeo, headMat);
    headL.position.set(-0.8, 0.68, -2.15);
    const headR = new THREE.Mesh(headGeo, headMat);
    headR.position.set(0.8, 0.68, -2.15);
    player.add(headL, headR);

    return {
        mesh: player,
        cabin: cabin,
        roof: roof,
        wheelGroup: wheelGroup,
        playerWheels: playerWheels,
        tailMat: tailMat
    };
}
