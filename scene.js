import * as THREE from 'three';
import { PALETTE } from './shaders/toon.js';
import { createLevel } from './src/level.js';
import { Player } from './src/player.js';
import { ThirdPersonCamera } from './src/camera.js';
import { Input } from './src/input.js';

/**
 * Creates flat stylized cloud shapes in the sky.
 * Clustered flat circular discs with the soft white architecture palette tone.
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

  cloudGroup.lookAt(0, 5, 0);
  return cloudGroup;
}

/**
 * Stage 1 Scene Setup:
 * - Sky blue background & stylized clouds
 * - Sun directional light & sun disc
 * - Stage 1 Level (sand ground, terracotta cliffs, bridge, white pillars)
 * - Hanuman Player placeholder (capsule body + sphere head + orange accent + outline)
 * - Third-person follow camera with drag-to-look and scroll-to-zoom
 * - Input system
 */
export function setupScene(container) {
  // 1. Scene
  const scene = new THREE.Scene();
  scene.background = new THREE.Color(PALETTE.skyBlue);

  // 2. Camera
  const camera = new THREE.PerspectiveCamera(
    50,
    window.innerWidth / window.innerHeight,
    0.1,
    500
  );

  // 3. Renderer
  const renderer = new THREE.WebGLRenderer({ antialias: true });
  renderer.setSize(window.innerWidth, window.innerHeight);
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
  renderer.toneMapping = THREE.NoToneMapping;
  container.appendChild(renderer.domElement);

  // 4. Lighting: Sun Directional Light & Sun Disc
  const sunPosition = new THREE.Vector3(25, 30, 20);
  const sunDirection = sunPosition.clone().normalize();

  const sunLight = new THREE.DirectionalLight('#FFF7EB', 1.3);
  sunLight.position.copy(sunPosition);
  scene.add(sunLight);

  const ambientLight = new THREE.HemisphereLight(PALETTE.skyBlue, PALETTE.warmSand, 0.45);
  scene.add(ambientLight);

  // Stylized sun disc visible high in the desert sky
  const sunGeometry = new THREE.CircleGeometry(3.5, 32);
  const sunMaterial = new THREE.MeshBasicMaterial({
    color: '#FFE27A',
    side: THREE.DoubleSide,
  });
  const sunDisc = new THREE.Mesh(sunGeometry, sunMaterial);
  sunDisc.position.copy(sunPosition.clone().multiplyScalar(3.2));
  sunDisc.lookAt(0, 0, 0);
  scene.add(sunDisc);

  // 5. Stylized Clouds
  const clouds = [];
  const cloudConfigs = [
    { x: -22, y: 18, z: -28, scale: 1.5, speed: 0.35 },
    { x: 14, y: 22, z: -32, scale: 1.8, speed: 0.28 },
    { x: 30, y: 16, z: -12, scale: 1.2, speed: 0.42 },
    { x: -30, y: 24, z: 10, scale: 1.6, speed: 0.3 },
    { x: -8, y: 25, z: -38, scale: 2.1, speed: 0.22 },
    { x: 26, y: 19, z: 24, scale: 1.4, speed: 0.38 },
  ];

  cloudConfigs.forEach((cfg) => {
    const cloud = createCloud(cfg.x, cfg.y, cfg.z, cfg.scale);
    scene.add(cloud);
    clouds.push({ group: cloud, speed: cfg.speed });
  });

  // 6. Test Level (Sand ground, terracotta cliffs, bridge, jumping pillars)
  const level = createLevel(scene, sunDirection);

  // 7. Player (Placeholder: capsule body + sphere head, orange palette accent + outline)
  const player = new Player(scene, sunDirection);
  // Start player slightly in front of the stepping pillars / cliffs
  player.position.set(0, 0, 0);

  // 8. Third-Person Follow Camera
  const thirdPersonCamera = new ThirdPersonCamera(camera, player, renderer.domElement);

  // 9. Input System
  const input = new Input(renderer.domElement);

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
    // 1. Update player physics, collisions, input, and movement
    player.update(delta, input, thirdPersonCamera, level.colliders);

    // 2. Update third-person follow camera
    thirdPersonCamera.update(delta, input);

    // 3. Update drifting clouds
    clouds.forEach(({ group, speed }) => {
      group.position.x += speed * delta;
      if (group.position.x > 50) {
        group.position.x = -50;
      }
      group.lookAt(camera.position);
    });

    // 4. Reset instantaneous input deltas for the frame
    input.update();
  }

  return {
    scene,
    camera,
    renderer,
    player,
    thirdPersonCamera,
    input,
    level,
    update,
    onResize,
  };
}
