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

    // 2. Capó delantero visible
    const hoodGeo = new THREE.BoxGeometry(2.1, 0.25, 1.8);
    const hood = new THREE.Mesh(hoodGeo, playerBodyMat);
    hood.position.set(0, 0.82, -1.2);
    hood.rotation.x = 0.05;
    player.add(hood);

    // 3. Cabina / Techo / Vidrios exteriores
    const cabinGeo = new THREE.BoxGeometry(1.9, 0.65, 2.2);
    const cabin = new THREE.Mesh(cabinGeo, playerGlassMat);
    cabin.position.set(0, 1.25, 0.2);
    player.add(cabin);

    const roof = new THREE.Mesh(new THREE.BoxGeometry(1.8, 0.08, 1.6), playerBodyMat);
    roof.position.set(0, 1.58, 0.25);
    player.add(roof);

    // 4. Tablero y consola interior visible en FPV
    const dashboard = new THREE.Mesh(new THREE.BoxGeometry(1.9, 0.45, 0.7), playerTrimMat);
    dashboard.position.set(0, 0.95, -0.4);
    player.add(dashboard);

    // Pantalla de instrumentos
    const cluster = new THREE.Mesh(new THREE.PlaneGeometry(0.5, 0.22), new THREE.MeshBasicMaterial({ color: 0x0284c7 }));
    cluster.position.set(-0.5, 1.1, -0.2);
    cluster.rotation.x = -Math.PI / 6;
    player.add(cluster);

    // 5. Volante 3D animado
    const wheelGroup = new THREE.Group();
    const wheelRim = new THREE.Mesh(new THREE.TorusGeometry(0.24, 0.035, 8, 16), playerTrimMat);
    const centerCap = new THREE.Mesh(new THREE.CylinderGeometry(0.07, 0.07, 0.04, 10), playerTrimMat);
    centerCap.rotation.x = Math.PI / 2;
    const spoke = new THREE.Mesh(new THREE.BoxGeometry(0.48, 0.035, 0.02), playerTrimMat);
    wheelGroup.add(wheelRim, centerCap, spoke);
    wheelGroup.position.set(-0.5, 1.05, -0.05);
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
