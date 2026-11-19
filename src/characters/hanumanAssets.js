import * as THREE from 'three';
import { PALETTE, createToonMaterial } from '../../shaders/toon.js';
import { addOutline } from '../../shaders/outline.js';

/**
 * Creates custom geometric assets and materials for the High-Quality Bala Hanuman model,
 * matching reference/Hanuman_Child.jpeg precisely.
 */

// Exact color palette matched from reference/Hanuman_Child.jpeg
export const HANUMAN_PALETTE = {
  skin: '#F5BA88',          // Warm golden-peachy skin/fur
  skinShadow: '#D99866',
  skinDark: '#B87242',

  muzzle: '#FCE4C6',        // Lighter cream skin for snout & lower face
  muzzleShadow: '#E8C59C',

  hair: '#3D2115',          // Dark chocolate-brown sculpted hair & tail tuft
  hairShadow: '#28140B',

  sashOrange: '#E86A2B',    // Saffron-orange diagonal chest sash
  sashOrangeShadow: '#B84510',

  dhotiCream: '#FAF4E8',    // Off-white / cream dhoti cloth
  dhotiCreamShadow: '#D8CCA8',

  sashCharcoal: '#3C4E5E',  // Dark charcoal / slate-blue waist sash
  sashCharcoalShadow: '#25323D',

  gold: '#E5A825',          // Traditional warm golden jewelry & buckle
  goldShadow: '#A6740E',

  tilakWhite: '#FFFDF9',    // Forehead tilak white outer 'U'
  tilakRed: '#E63B2E',      // Forehead tilak vermillion red center line

  eyeWhite: '#FFFDF5',
  eyeIris: '#522E1A',       // Rich warm brown iris
  eyePupil: '#1E120B',
  eyeHighlight: '#FFFFFF',

  nose: '#2E1910',
  mouth: '#8A3B24',
};

/**
 * Procedural texture generator for high-quality painted eyes matching the reference.
 */
export function createEyeTexture() {
  const canvas = document.createElement('canvas');
  canvas.width = 256;
  canvas.height = 256;
  const ctx = canvas.getContext('2d');

  // Sclera (soft warm white)
  ctx.fillStyle = '#FFFDF5';
  ctx.fillRect(0, 0, 256, 256);

  // Iris (concentric rich amber-brown gradient)
  const grad = ctx.createRadialGradient(128, 128, 18, 128, 128, 96);
  grad.addColorStop(0, '#7A4324');
  grad.addColorStop(0.65, '#522E1A');
  grad.addColorStop(1, '#2B150A');

  ctx.beginPath();
  ctx.arc(128, 128, 96, 0, Math.PI * 2);
  ctx.fillStyle = grad;
  ctx.fill();

  // Dark pupil
  ctx.beginPath();
  ctx.arc(128, 128, 46, 0, Math.PI * 2);
  ctx.fillStyle = '#1A0D07';
  ctx.fill();

  // Upper eyelid shadow cast over top of iris
  ctx.beginPath();
  ctx.arc(128, 128, 96, Math.PI, Math.PI * 2);
  ctx.fillStyle = 'rgba(25, 12, 6, 0.45)';
  ctx.fill();

  // Bright white specular highlights (large primary + small secondary)
  ctx.fillStyle = '#FFFFFF';
  ctx.beginPath();
  ctx.arc(104, 100, 22, 0, Math.PI * 2);
  ctx.fill();

  ctx.beginPath();
  ctx.arc(154, 150, 10, 0, Math.PI * 2);
  ctx.fill();

  const texture = new THREE.CanvasTexture(canvas);
  texture.generateMipmaps = true;
  return texture;
}

/**
 * Builds a sculpted 3D Vaishnava Tilak for Bala Hanuman's forehead:
 * A crisp white 'U' shape with a bright vermillion red line in the middle.
 */
export function createTilakMesh(sunDirection) {
  const tilakGroup = new THREE.Group();
  tilakGroup.name = 'forehead_tilak';

  const whiteMat = createToonMaterial({
    color: HANUMAN_PALETTE.tilakWhite,
    midColor: '#E8E2D3',
    shadowColor: '#C4BCAC',
    lightDirection: sunDirection,
  });

  const redMat = createToonMaterial({
    color: HANUMAN_PALETTE.tilakRed,
    midColor: '#BD281D',
    shadowColor: '#8C1810',
    lightDirection: sunDirection,
  });

  // 1. White 'U' frame: left pillar, right pillar, bottom curve
  const uShape = new THREE.Shape();
  // Outer boundary of 'U'
  uShape.moveTo(-0.045, 0.10);
  uShape.lineTo(-0.045, -0.02);
  uShape.quadraticCurveTo(-0.045, -0.065, 0.0, -0.075);
  uShape.quadraticCurveTo(0.045, -0.065, 0.045, -0.02);
  uShape.lineTo(0.045, 0.10);
  uShape.lineTo(0.025, 0.10);
  uShape.lineTo(0.025, -0.02);
  uShape.quadraticCurveTo(0.025, -0.045, 0.0, -0.052);
  uShape.quadraticCurveTo(-0.025, -0.045, -0.025, -0.02);
  uShape.lineTo(-0.025, 0.10);
  uShape.closePath();

  const extrudeSettings = { depth: 0.015, bevelEnabled: true, bevelSegments: 2, steps: 1, bevelSize: 0.004, bevelThickness: 0.004 };
  const whiteGeom = new THREE.ExtrudeGeometry(uShape, extrudeSettings);
  const whiteMesh = new THREE.Mesh(whiteGeom, whiteMat);
  tilakGroup.add(whiteMesh);

  // 2. Vermillion Red vertical line in the center
  const redShape = new THREE.Shape();
  redShape.moveTo(-0.010, 0.09);
  redShape.lineTo(0.010, 0.09);
  redShape.lineTo(0.010, -0.025);
  redShape.quadraticCurveTo(0.0, -0.045, -0.010, -0.025);
  redShape.closePath();

  const redGeom = new THREE.ExtrudeGeometry(redShape, extrudeSettings);
  const redMesh = new THREE.Mesh(redGeom, redMat);
  redMesh.position.z = 0.006;
  tilakGroup.add(redMesh);

  return tilakGroup;
}

/**
 * Creates sculpted chunky hair volume and stylized locks framing the face.
 */
export function createHairMesh(hairMaterial) {
  const hairGroup = new THREE.Group();
  hairGroup.name = 'sculpted_hair';

  // 1. Skull Cap Volume (sculpted back & top of head)
  const skullCapGeom = new THREE.SphereGeometry(0.31, 20, 16);
  const skullCap = new THREE.Mesh(skullCapGeom, hairMaterial);
  skullCap.position.set(0, 0.06, -0.05);
  skullCap.scale.set(1.08, 1.14, 1.18);
  hairGroup.add(skullCap);
  addOutline(skullCap, { color: PALETTE.outlineDarkWarm, thickness: 0.026 });

  // 2. Rounded Topknot / Bun at crown
  const bunGeom = new THREE.SphereGeometry(0.14, 16, 14);
  const bunMesh = new THREE.Mesh(bunGeom, hairMaterial);
  bunMesh.position.set(0, 0.38, -0.08);
  bunMesh.scale.set(1.15, 1.25, 1.1);
  hairGroup.add(bunMesh);
  addOutline(bunMesh, { color: PALETTE.outlineDarkWarm, thickness: 0.026 });

  // 3. Golden ring wrapping the topknot base
  const goldRingGeom = new THREE.TorusGeometry(0.12, 0.03, 10, 20);
  const goldRingMat = createToonMaterial({ color: HANUMAN_PALETTE.gold, midColor: '#C48D15', shadowColor: '#8C6007' });
  const goldRing = new THREE.Mesh(goldRingGeom, goldRingMat);
  goldRing.rotation.x = Math.PI / 2 + 0.3;
  goldRing.position.set(0, 0.32, -0.08);
  hairGroup.add(goldRing);
  addOutline(goldRing, { color: PALETTE.outlineDarkWarm, thickness: 0.02 });

  // 4. Stylized Curved Front & Side Locks (matching reference sheet tufts)
  const lockConfigs = [
    // Forehead center locks
    { x: -0.08, y: 0.26, z: 0.22, rot: [0.3, 0.2, 0.4], scale: [0.10, 0.18, 0.08] },
    { x: 0.08, y: 0.26, z: 0.22, rot: [0.3, -0.2, -0.4], scale: [0.10, 0.18, 0.08] },
    { x: 0.0, y: 0.29, z: 0.23, rot: [0.2, 0.0, 0.0], scale: [0.11, 0.16, 0.08] },

    // Left temple & cheek locks
    { x: 0.22, y: 0.20, z: 0.14, rot: [0.1, 0.4, -0.8], scale: [0.12, 0.22, 0.10] },
    { x: 0.26, y: 0.08, z: 0.08, rot: [-0.1, 0.6, -1.0], scale: [0.11, 0.20, 0.09] },

    // Right temple & cheek locks
    { x: -0.22, y: 0.20, z: 0.14, rot: [0.1, -0.4, 0.8], scale: [0.12, 0.22, 0.10] },
    { x: -0.26, y: 0.08, z: 0.08, rot: [-0.1, -0.6, 1.0], scale: [0.11, 0.20, 0.09] },

    // Side tufts above ears
    { x: 0.28, y: 0.25, z: -0.02, rot: [0.4, 0.3, -0.6], scale: [0.13, 0.22, 0.11] },
    { x: -0.28, y: 0.25, z: -0.02, rot: [0.4, -0.3, 0.6], scale: [0.13, 0.22, 0.11] },
  ];

  const lockGeom = new THREE.ConeGeometry(0.7, 1.5, 7);
  lockConfigs.forEach((cfg) => {
    const lock = new THREE.Mesh(lockGeom, hairMaterial);
    lock.position.set(cfg.x, cfg.y, cfg.z);
    lock.rotation.set(cfg.rot[0], cfg.rot[1], cfg.rot[2]);
    lock.scale.set(cfg.scale[0], cfg.scale[1], cfg.scale[2]);
    hairGroup.add(lock);
    addOutline(lock, { color: PALETTE.outlineDarkWarm, thickness: 0.022 });
  });

  return hairGroup;
}
