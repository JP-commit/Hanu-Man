import * as THREE from 'three';
import { PALETTE, createToonMaterial } from '../../shaders/toon.js';
import { addOutline } from '../../shaders/outline.js';

/**
 * Creates a stylized low-poly collectible mango with a small green leaf.
 */
function createMangoMesh(sunDirection) {
  const mangoGroup = new THREE.Group();

  const mangoMaterial = createToonMaterial({
    color: '#FFA500', // vibrant ripe mango orange
    midColor: '#E67E00',
    shadowColor: '#B35300',
    lightDirection: sunDirection,
    thresholds: [-0.05, 0.45],
  });

  const leafMaterial = createToonMaterial({
    color: '#5DAE5B', // fresh green leaf
    midColor: '#458243',
    shadowColor: '#2F5A2E',
    lightDirection: sunDirection,
  });

  // Mango fruit body (low poly tapered oval)
  const fruitGeom = new THREE.SphereGeometry(0.32, 10, 8);
  const fruitMesh = new THREE.Mesh(fruitGeom, mangoMaterial);
  fruitMesh.scale.set(0.85, 1.25, 0.95);
  fruitMesh.rotation.z = 0.2;
  mangoGroup.add(fruitMesh);

  addOutline(fruitMesh, {
    color: PALETTE.outlineDarkWarm,
    thickness: 0.03,
  });

  // Little green stem and leaf
  const leafGeom = new THREE.ConeGeometry(0.12, 0.25, 5);
  const leafMesh = new THREE.Mesh(leafGeom, leafMaterial);
  leafMesh.position.set(0.08, 0.42, 0);
  leafMesh.rotation.z = -0.7;
  mangoGroup.add(leafMesh);

  addOutline(leafMesh, {
    color: PALETTE.outlineDarkWarm,
    thickness: 0.02,
  });

  return mangoGroup;
}

/**
 * Builds Chapter 1 Level:
 * - Village area with white buildings and teal domes
 * - Winding ascending terracotta cliffs, narrow bridges, and jumping pillars
 * - Midpoint mountain checkpoint
 * - Summit platform
 * - Dynamic scalable sun with warm halos
 * - Collectible mangoes
 */
export function createChapter1Level(scene, sunDirection) {
  const levelGroup = new THREE.Group();
  levelGroup.name = 'chapter1_level';
  scene.add(levelGroup);

  const colliders = [];
  const mangoes = [];

  // --- Materials ---
  const terracottaMat = createToonMaterial({
    color: PALETTE.terracottaRed,
    midColor: '#B4574E',
    shadowColor: PALETTE.terracottaRedShadow,
    lightDirection: sunDirection,
  });

  const whiteMat = createToonMaterial({
    color: PALETTE.softWhite,
    midColor: PALETTE.softWhiteMid,
    shadowColor: PALETTE.softWhiteShadow,
    lightDirection: sunDirection,
  });

  const tealMat = createToonMaterial({
    color: PALETTE.tealDome,
    midColor: PALETTE.tealDomeMid,
    shadowColor: PALETTE.tealDomeShadow,
    lightDirection: sunDirection,
  });

  // --- 1. Sand Ground ---
  const groundGeom = new THREE.CircleGeometry(75, 64);
  const groundMat = createToonMaterial({
    color: PALETTE.warmSand,
    midColor: PALETTE.warmSandMid,
    shadowColor: PALETTE.warmSandShadow,
    lightDirection: sunDirection,
    thresholds: [-0.1, 0.3],
  });
  const groundMesh = new THREE.Mesh(groundGeom, groundMat);
  groundMesh.rotation.x = -Math.PI / 2;
  groundMesh.position.y = 0;
  levelGroup.add(groundMesh);

  // Helper to add boxed obstacle + collider
  function addBox({ x, y, z, width, height, depth, material, name = 'box' }) {
    const geom = new THREE.BoxGeometry(width, height, depth);
    const mesh = new THREE.Mesh(geom, material);
    mesh.name = name;
    mesh.position.set(x, y, z);
    levelGroup.add(mesh);

    addOutline(mesh, {
      color: PALETTE.outlineDarkWarm,
      thickness: 0.035,
    });

    const halfW = width / 2;
    const halfH = height / 2;
    const halfD = depth / 2;
    const box = new THREE.Box3(
      new THREE.Vector3(x - halfW, y - halfH, z - halfD),
      new THREE.Vector3(x + halfW, y + halfH, z + halfD)
    );
    colliders.push(box);
    return mesh;
  }

  // --- 2. Starting Village Area (around z = 8 to 22) ---
  // Left Temple Building
  addBox({
    x: -8,
    y: 1.75,
    z: 12,
    width: 5,
    height: 3.5,
    depth: 5,
    material: whiteMat,
    name: 'village_temple_left',
  });

  // Teal Dome on Left Temple
  const leftDomeGeom = new THREE.SphereGeometry(1.9, 18, 14, 0, Math.PI * 2, 0, Math.PI / 2);
  const leftDomeMesh = new THREE.Mesh(leftDomeGeom, tealMat);
  leftDomeMesh.position.set(-8, 3.5, 12);
  levelGroup.add(leftDomeMesh);
  addOutline(leftDomeMesh, { color: PALETTE.outlineDarkWarm, thickness: 0.035 });

  // Right Village Building
  addBox({
    x: 8,
    y: 1.5,
    z: 13,
    width: 4.5,
    height: 3.0,
    depth: 4.5,
    material: whiteMat,
    name: 'village_home_right',
  });

  // Teal Dome on Right Home
  const rightDomeGeom = new THREE.SphereGeometry(1.6, 16, 12, 0, Math.PI * 2, 0, Math.PI / 2);
  const rightDomeMesh = new THREE.Mesh(rightDomeGeom, tealMat);
  rightDomeMesh.position.set(8, 3.0, 13);
  levelGroup.add(rightDomeMesh);
  addOutline(rightDomeMesh, { color: PALETTE.outlineDarkWarm, thickness: 0.035 });

  // Village courtyard gateway arch
  addBox({
    x: -3.5,
    y: 1.5,
    z: 18,
    width: 1.0,
    height: 3.0,
    depth: 1.0,
    material: whiteMat,
    name: 'arch_col_left',
  });
  addBox({
    x: 3.5,
    y: 1.5,
    z: 18,
    width: 1.0,
    height: 3.0,
    depth: 1.0,
    material: whiteMat,
    name: 'arch_col_right',
  });
  addBox({
    x: 0,
    y: 3.2,
    z: 18,
    width: 8.0,
    height: 0.5,
    depth: 1.2,
    material: terracottaMat,
    name: 'arch_beam',
  });

  // Small courtyard low perimeter walls
  addBox({ x: -11, y: 0.4, z: 12, width: 1.2, height: 0.8, depth: 7, material: whiteMat });
  addBox({ x: 11, y: 0.4, z: 13, width: 1.2, height: 0.8, depth: 7, material: whiteMat });

  // --- 3. Ascending Climbing Path (z: 6 down to -38) ---
  // Step 1: Low Terracotta Ledge (height 1.2m)
  addBox({
    x: 0,
    y: 0.6,
    z: 3,
    width: 5.5,
    height: 1.2,
    depth: 4.5,
    material: terracottaMat,
    name: 'path_cliff_1',
  });

  // Step 2: Second Terracotta Platform (height 2.4m)
  addBox({
    x: -4.5,
    y: 1.2,
    z: -2,
    width: 5.0,
    height: 2.4,
    depth: 5.0,
    material: terracottaMat,
    name: 'path_cliff_2',
  });

  // Step 3: White Stepping Pillar 1 (height 3.5m)
  addBox({
    x: -4.5,
    y: 1.75,
    z: -7,
    width: 2.0,
    height: 3.5,
    depth: 2.0,
    material: whiteMat,
    name: 'path_pillar_1',
  });

  // Step 4: Ridge Cliff 3 (height 4.6m)
  addBox({
    x: 0,
    y: 2.3,
    z: -11,
    width: 5.0,
    height: 4.6,
    depth: 5.0,
    material: terracottaMat,
    name: 'path_cliff_3',
  });

  // Step 5: Narrow Bridge 1 (length 6.5m, width 1.3m, connecting cliff 3 to cliff 4)
  addBox({
    x: 4.5,
    y: 4.4,
    z: -11,
    width: 4.5,
    height: 0.4,
    depth: 1.4,
    material: whiteMat,
    name: 'narrow_bridge_1',
  });

  // Step 6: Midpoint Mountain Ridge & Checkpoint Platform (height 6.0m)
  // Large wide platform at (8, 3.0, -11) to (8, 3.0, -18)
  const checkpointPlatform = addBox({
    x: 8.0,
    y: 3.0,
    z: -16,
    width: 6.5,
    height: 6.0,
    depth: 8.5,
    material: terracottaMat,
    name: 'checkpoint_ridge',
  });

  // Checkpoint decorative shrine stone
  const shrineMesh = addBox({
    x: 9.5,
    y: 6.6,
    z: -16,
    width: 1.2,
    height: 1.2,
    depth: 1.2,
    material: whiteMat,
    name: 'checkpoint_shrine',
  });
  // Small teal cap on shrine
  const shrineCapGeom = new THREE.ConeGeometry(0.8, 0.7, 4);
  const shrineCapMesh = new THREE.Mesh(shrineCapGeom, tealMat);
  shrineCapMesh.position.set(9.5, 7.55, -16);
  shrineCapMesh.rotation.y = Math.PI / 4;
  levelGroup.add(shrineCapMesh);
  addOutline(shrineCapMesh, { color: PALETTE.outlineDarkWarm, thickness: 0.03 });

  // Checkpoint spawn coordinate
  const checkpointPosition = new THREE.Vector3(7.5, 6.0, -16);

  // Step 7: Upper Stepping Pillars towards the summit
  // Pillar A (height 7.8m)
  addBox({
    x: 3.5,
    y: 3.9,
    z: -21,
    width: 1.8,
    height: 7.8,
    depth: 1.8,
    material: whiteMat,
    name: 'upper_pillar_a',
  });

  // Pillar B (height 9.8m)
  addBox({
    x: -1.0,
    y: 4.9,
    z: -24,
    width: 1.8,
    height: 9.8,
    depth: 1.8,
    material: whiteMat,
    name: 'upper_pillar_b',
  });

  // Pillar C (height 11.8m)
  addBox({
    x: -5.5,
    y: 5.9,
    z: -27,
    width: 2.0,
    height: 11.8,
    depth: 2.0,
    material: whiteMat,
    name: 'upper_pillar_c',
  });

  // Step 8: High Narrow Bridge 2 (connecting Pillar C to Upper Cliff)
  addBox({
    x: -2.0,
    y: 11.6,
    z: -30,
    width: 6.0,
    height: 0.4,
    depth: 1.3,
    material: whiteMat,
    name: 'high_bridge_2',
  });

  // Upper Cliff (height 13.5m)
  addBox({
    x: 2.5,
    y: 6.75,
    z: -32,
    width: 5.0,
    height: 13.5,
    depth: 5.0,
    material: terracottaMat,
    name: 'upper_cliff',
  });

  // Final Steps to Summit
  addBox({
    x: 5.5,
    y: 7.6,
    z: -35,
    width: 2.5,
    height: 15.2,
    depth: 2.5,
    material: whiteMat,
    name: 'summit_step_1',
  });

  // Step 9: The Grand Summit Platform (height 17.0m)
  const summitPlatform = addBox({
    x: 8.0,
    y: 8.5,
    z: -39,
    width: 6.0,
    height: 17.0,
    depth: 6.0,
    material: whiteMat,
    name: 'summit_platform',
  });

  // Summit altar / dais with teal trim
  const daisMat = createToonMaterial({
    color: PALETTE.softWhite,
    midColor: PALETTE.softWhiteMid,
    shadowColor: PALETTE.softWhiteShadow,
    lightDirection: sunDirection,
  });
  const daisMesh = addBox({
    x: 8.0,
    y: 17.2,
    z: -39,
    width: 3.0,
    height: 0.4,
    depth: 3.0,
    material: daisMat,
    name: 'summit_dais',
  });

  // Summit trigger position
  const summitTrigger = {
    center: new THREE.Vector3(8.0, 17.4, -39),
    radius: 2.8,
  };

  // --- 4. The Dynamic Glowing Sun with Halo ---
  const sunGroup = new THREE.Group();
  sunGroup.name = 'celestial_sun';

  // Base sun disc
  const sunDiscGeom = new THREE.CircleGeometry(5.0, 36);
  const sunDiscMat = new THREE.MeshBasicMaterial({
    color: '#FFE27A',
    side: THREE.DoubleSide,
  });
  const sunCoreMesh = new THREE.Mesh(sunDiscGeom, sunDiscMat);
  sunGroup.add(sunCoreMesh);

  // Soft Inner Warm Halo
  const innerHaloGeom = new THREE.CircleGeometry(7.2, 36);
  const innerHaloMat = new THREE.MeshBasicMaterial({
    color: '#FFAE33',
    side: THREE.DoubleSide,
    transparent: true,
    opacity: 0.55,
    depthWrite: false,
  });
  const innerHaloMesh = new THREE.Mesh(innerHaloGeom, innerHaloMat);
  innerHaloMesh.position.z = -0.05;
  sunGroup.add(innerHaloMesh);

  // Soft Outer Amber Halo
  const outerHaloGeom = new THREE.CircleGeometry(10.5, 36);
  const outerHaloMat = new THREE.MeshBasicMaterial({
    color: '#FF8800',
    side: THREE.DoubleSide,
    transparent: true,
    opacity: 0.32,
    depthWrite: false,
  });
  const outerHaloMesh = new THREE.Mesh(outerHaloGeom, outerHaloMat);
  outerHaloMesh.position.z = -0.1;
  sunGroup.add(outerHaloMesh);

  // Position Sun high in the sky directly aligned with the summit ascent
  const baseSunPos = new THREE.Vector3(8.0, 42.0, -80.0);
  sunGroup.position.copy(baseSunPos);
  sunGroup.lookAt(8.0, 10.0, 0.0);
  levelGroup.add(sunGroup);

  // --- 5. Collectible Mangoes (Low-poly orange fruits along the path) ---
  const mangoLocations = [
    new THREE.Vector3(-8.0, 4.0, 12.0),   // 1. Village temple roof (exploration reward)
    new THREE.Vector3(-4.5, 3.0, -2.0),   // 2. Platform 2
    new THREE.Vector3(4.5, 5.2, -11.0),   // 3. Narrow bridge 1 center
    new THREE.Vector3(9.5, 8.4, -16.0),   // 4. Shrine top at checkpoint
    new THREE.Vector3(-1.0, 10.6, -24.0), // 5. Upper pillar B top
    new THREE.Vector3(-2.0, 12.4, -30.0), // 6. High bridge 2 center
    new THREE.Vector3(5.5, 16.0, -35.0),  // 7. Summit approach step
  ];

  mangoLocations.forEach((loc, index) => {
    const mesh = createMangoMesh(sunDirection);
    mesh.position.copy(loc);
    levelGroup.add(mesh);

    mangoes.push({
      id: index,
      mesh,
      basePos: loc.clone(),
      collected: false,
      radius: 0.7,
    });
  });

  /**
   * Updates sun scale as player climbs and animates mangoes
   */
  function update(time, delta, playerPos) {
    // 1. Animate mangoes (gentle floating bob + rotation)
    mangoes.forEach((mango) => {
      if (!mango.collected) {
        mango.mesh.rotation.y += 1.8 * delta;
        const bob = Math.sin(time * 3.0 + mango.id) * 0.12;
        mango.mesh.position.y = mango.basePos.y + bob;
      }
    });

    // 2. Dynamic Sun scaling: gets larger as player ascends from y=0 to y=18
    const climbProgress = Math.max(0, Math.min(1.0, (playerPos ? playerPos.y : 0) / 18.0));
    // Scale smoothly from 1.0x to 1.75x as player climbs higher
    const targetScale = 1.0 + climbProgress * 0.75;
    sunGroup.scale.set(targetScale, targetScale, targetScale);
  }

  return {
    group: levelGroup,
    colliders,
    mangoes,
    sunGroup,
    baseSunPos,
    checkpointPosition,
    summitTrigger,
    update,
  };
}
