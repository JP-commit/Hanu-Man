import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { PALETTE, createToonMaterial } from './shaders/toon.js';
import { addOutline } from './shaders/outline.js';

/**
 * Creates flat stylized cloud shapes in the sky.
 * Each cloud is a cluster of overlapping flat circular discs (hand-painted anime style).
 */
function createCloud(x, y, z, scale = 1) {
  const cloudGroup = new THREE.Group();
  cloudGroup.position.set(x, y, z);

  const discMaterial = new THREE.MeshBasicMaterial({
    color: PALETTE.softWhite,
    side: THREE.DoubleSide,
    transparent: true,
    opacity: 0.95,
    depthWrite: false,
  });

  // Flat circles clustered into a stylized cloud silhouette
  const discs = [
    { radius: 2.2, offset: [0, 0, 0] },
    { radius: 1.7, offset: [-1.8, -0.3, 0] },
    { radius: 1.9, offset: [1.7, -0.2, 0] },
    { radius: 1.2, offset: [-3.0, -0.7, 0] },
    { radius: 1.3, offset: [2.9, -0.6, 0] },
    { radius: 1.4, offset: [0.6, 1.1, 0] },
    { radius: 1.2, offset: [-0.9, 0.9, 0] },
  ];

  discs.forEach(({ radius, offset }) => {
    const geom = new THREE.CircleGeometry(radius * scale, 24);
    const mesh = new THREE.Mesh(geom, discMaterial);
    mesh.position.set(offset[0] * scale, offset[1] * scale, offset[2] * scale);
    cloudGroup.add(mesh);
  });

  // Face roughly towards scene center
  cloudGroup.lookAt(0, 5, 0);

  return cloudGroup;
}

/**
 * Initializes and builds the Three.js scene according to Stage 0 requirements:
 * - Sky-blue background (#7FB0E8)
 * - Sand-coloured ground plane (#F0C9A0)
 * - Test capsule with 3-band cel-shading and inverted-hull outline
 * - Directional sun light + stylized white clouds in the sky
 * - Orbit camera with smooth auto-rotation
 */
export function setupScene(container) {
  // 1. Scene
  const scene = new THREE.Scene();
  scene.background = new THREE.Color(PALETTE.skyBlue);

  // 2. Camera
  const camera = new THREE.PerspectiveCamera(
    45,
    window.innerWidth / window.innerHeight,
    0.1,
    500
  );
  camera.position.set(0, 3.2, 8.5);

  // 3. Renderer
  const renderer = new THREE.WebGLRenderer({ antialias: true });
  renderer.setSize(window.innerWidth, window.innerHeight);
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
  renderer.toneMapping = THREE.NoToneMapping; // Preserves exact flat art palette colors
  container.appendChild(renderer.domElement);

  // 4. Orbit Controls (slow orbit camera)
  const controls = new OrbitControls(camera, renderer.domElement);
  controls.enableDamping = true;
  controls.dampingFactor = 0.05;
  controls.autoRotate = true;
  controls.autoRotateSpeed = 0.6; // Slow orbit so the user can look around
  controls.target.set(0, 1.2, 0);
  controls.minDistance = 2.5;
  controls.maxDistance = 35.0;
  controls.maxPolarAngle = Math.PI / 2 - 0.03; // Stay above ground plane

  // 5. Lighting: Sun Directional Light & Sun Disc
  const sunPosition = new THREE.Vector3(20, 26, 16);
  const sunDirection = sunPosition.clone().normalize();

  const sunLight = new THREE.DirectionalLight('#FFF7EB', 1.25);
  sunLight.position.copy(sunPosition);
  scene.add(sunLight);

  const ambientLight = new THREE.HemisphereLight(PALETTE.skyBlue, PALETTE.warmSand, 0.45);
  scene.add(ambientLight);

  // Stylized sun disc visible high in the sky (alluding to Hanuman and the Sun)
  const sunGeometry = new THREE.CircleGeometry(2.8, 32);
  const sunMaterial = new THREE.MeshBasicMaterial({
    color: '#FFE27A',
    side: THREE.DoubleSide,
  });
  const sunDisc = new THREE.Mesh(sunGeometry, sunMaterial);
  sunDisc.position.copy(sunPosition.clone().multiplyScalar(3.0));
  sunDisc.lookAt(0, 0, 0);
  scene.add(sunDisc);

  // 6. Ground Plane (Warm sand #F0C9A0 with 3-band cel shading)
  const groundGeometry = new THREE.CircleGeometry(45, 64);
  const groundMaterial = createToonMaterial({
    color: PALETTE.warmSand,
    midColor: PALETTE.warmSandMid,
    shadowColor: PALETTE.warmSandShadow,
    lightDirection: sunDirection,
    thresholds: [-0.1, 0.3],
  });
  const groundMesh = new THREE.Mesh(groundGeometry, groundMaterial);
  groundMesh.rotation.x = -Math.PI / 2;
  groundMesh.position.y = 0;
  scene.add(groundMesh);

  // 7. Test Object: Capsule with Cel-Shading & Inverted-Hull Outline
  const capsuleRadius = 0.6;
  const capsuleLength = 1.4;
  const capsuleGeometry = new THREE.CapsuleGeometry(capsuleRadius, capsuleLength, 20, 32);

  const capsuleMaterial = createToonMaterial({
    color: PALETTE.hanumanOrange,
    midColor: PALETTE.hanumanOrangeMid,
    shadowColor: PALETTE.hanumanOrangeShadow,
    lightDirection: sunDirection,
    thresholds: [-0.05, 0.45],
  });

  const capsuleMesh = new THREE.Mesh(capsuleGeometry, capsuleMaterial);
  capsuleMesh.name = 'test_capsule';
  // Position so the bottom of the capsule rests on the ground plane (y = 0)
  const capsuleHalfHeight = capsuleLength / 2 + capsuleRadius;
  capsuleMesh.position.set(0, capsuleHalfHeight, 0);
  scene.add(capsuleMesh);

  // Add thin dark-warm outline using inverted-hull method
  addOutline(capsuleMesh, {
    color: PALETTE.outlineDarkWarm,
    thickness: 0.035,
  });

  // 8. Stylized Clouds (simple flat white shapes floating in the sky)
  const clouds = [];
  const cloudConfigs = [
    { x: -18, y: 16, z: -25, scale: 1.4, speed: 0.35 },
    { x: 12, y: 19, z: -30, scale: 1.8, speed: 0.28 },
    { x: 28, y: 14, z: -10, scale: 1.2, speed: 0.42 },
    { x: -26, y: 20, z: 8, scale: 1.5, speed: 0.3 },
    { x: -5, y: 22, z: -35, scale: 2.0, speed: 0.22 },
    { x: 22, y: 17, z: 20, scale: 1.3, speed: 0.38 },
  ];

  cloudConfigs.forEach((cfg) => {
    const cloud = createCloud(cfg.x, cfg.y, cfg.z, cfg.scale);
    scene.add(cloud);
    clouds.push({ group: cloud, speed: cfg.speed, initialZ: cfg.z });
  });

  // Resize handler
  function onResize() {
    camera.aspect = window.innerWidth / window.innerHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(window.innerWidth, window.innerHeight);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
  }

  window.addEventListener('resize', onResize);

  // Per-frame update hook
  function update(time, delta) {
    controls.update();

    // Gentle cloud drifting across the desert sky
    clouds.forEach(({ group, speed }) => {
      group.position.x += speed * delta;
      if (group.position.x > 45) {
        group.position.x = -45;
      }
      group.lookAt(camera.position); // Billboard gently towards active camera angle
    });

    // Subtle gentle idle breathing on the test capsule
    const breathe = 1 + Math.sin(time * 2.0) * 0.02;
    capsuleMesh.scale.set(1 / Math.sqrt(breathe), breathe, 1 / Math.sqrt(breathe));
  }

  return {
    scene,
    camera,
    renderer,
    controls,
    capsule: capsuleMesh,
    update,
    onResize,
  };
}
