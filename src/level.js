import * as THREE from 'three';
import { PALETTE, createToonMaterial } from '../shaders/toon.js';
import { addOutline } from '../shaders/outline.js';

/**
 * Builds the Stage 1 test level:
 * - Flat sand ground plane
 * - Terracotta cliff platforms of various heights
 * - Narrow elevated bridge connecting cliff tops
 * - Stylized soft white pillar blocks for jumping practice
 * Returns the level group and a list of AABB colliders (THREE.Box3).
 */
export function createLevel(scene, sunDirection) {
  const levelGroup = new THREE.Group();
  levelGroup.name = 'test_level';
  scene.add(levelGroup);

  const colliders = [];

  // 1. Ground Plane (Warm sand #F0C9A0)
  const groundGeom = new THREE.CircleGeometry(60, 64);
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

  // Materials
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

  // Helper to create an AABB box obstacle with cel-shading, outline, and collider
  function addBox({ x, y, z, width, height, depth, material, name = 'box' }) {
    const geom = new THREE.BoxGeometry(width, height, depth);
    const mesh = new THREE.Mesh(geom, material);
    mesh.name = name;
    mesh.position.set(x, y, z);
    levelGroup.add(mesh);

    // Inverted-hull outline
    addOutline(mesh, {
      color: PALETTE.outlineDarkWarm,
      thickness: 0.035,
    });

    // AABB collider
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

  // --- 2. Terracotta Cliff Platforms ---
  // Low cliff / step platform (height 1.2m - easy jump from ground)
  addBox({
    x: -5,
    y: 0.6,
    z: -3,
    width: 6,
    height: 1.2,
    depth: 6,
    material: terracottaMat,
    name: 'cliff_low',
  });

  // Medium stepped cliff (height 2.4m)
  addBox({
    x: -5,
    y: 1.8,
    z: -9,
    width: 6,
    height: 1.2,
    depth: 6,
    material: terracottaMat,
    name: 'cliff_step',
  });

  // Cliff A (height 3.5m)
  addBox({
    x: -8,
    y: 1.75,
    z: -17,
    width: 8,
    height: 3.5,
    depth: 8,
    material: terracottaMat,
    name: 'cliff_high_left',
  });

  // Cliff B (North platform, height 3.2m)
  addBox({
    x: 8,
    y: 1.6,
    z: -10,
    width: 7,
    height: 3.2,
    depth: 7,
    material: terracottaMat,
    name: 'cliff_north',
  });

  // Cliff C (South platform, height 3.2m)
  addBox({
    x: 8,
    y: 1.6,
    z: 4,
    width: 7,
    height: 3.2,
    depth: 7,
    material: terracottaMat,
    name: 'cliff_south',
  });

  // --- 3. Narrow Elevated Bridge (connecting Cliff B and Cliff C) ---
  // Bridge width 1.4m, length 7.0m, top surface aligns with cliffs at y = 3.2m
  addBox({
    x: 8,
    y: 3.0,
    z: -3,
    width: 1.4,
    height: 0.4,
    depth: 7.0,
    material: whiteMat,
    name: 'narrow_bridge',
  });

  // Small bridge guard arch accents at bridge entrances
  addBox({
    x: 8,
    y: 3.6,
    z: -6.4,
    width: 1.6,
    height: 0.8,
    depth: 0.4,
    material: terracottaMat,
    name: 'bridge_arch_north',
  });

  addBox({
    x: 8,
    y: 3.6,
    z: 0.4,
    width: 1.6,
    height: 0.8,
    depth: 0.4,
    material: terracottaMat,
    name: 'bridge_arch_south',
  });

  // --- 4. Stepping Pillar Blocks to Jump Between ---
  // Stepping stone sequence across the open desert
  const pillarConfigs = [
    { x: -2, y: 0.6, z: 4, width: 1.6, height: 1.2, depth: 1.6 },
    { x: 0, y: 0.9, z: 7, width: 1.5, height: 1.8, depth: 1.5 },
    { x: 3, y: 1.25, z: 9, width: 1.4, height: 2.5, depth: 1.4 },
    { x: 6, y: 1.5, z: 8, width: 1.3, height: 3.0, depth: 1.3 },
    { x: 7.5, y: 1.8, z: 6, width: 1.5, height: 3.6, depth: 1.5 }, // allows jumping onto Cliff C!
  ];

  pillarConfigs.forEach((cfg, i) => {
    addBox({
      x: cfg.x,
      y: cfg.y,
      z: cfg.z,
      width: cfg.width,
      height: cfg.height,
      depth: cfg.depth,
      material: whiteMat,
      name: `pillar_${i + 1}`,
    });
  });

  return {
    group: levelGroup,
    colliders,
  };
}
