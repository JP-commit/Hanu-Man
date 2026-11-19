import * as THREE from 'three';
import { PALETTE } from './shaders/toon.js';
import { createChapter1Level } from './src/levels/chapter1.js';
import { Player } from './src/player.js';
import { ThirdPersonCamera } from './src/camera.js';
import { Input } from './src/input.js';
import { Game } from './src/game.js';

/**
 * Creates flat stylized cloud shapes in the sky.
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
 * Stage 2 Scene Setup:
 * - Chapter 1: The Sun
 * - Sky blue background & drifting clouds
 * - Directional sunlight and ambient hemisphere light
 * - Chapter 1 Level (Village, ascending terracotta cliffs, narrow bridges, white pillars, checkpoint, summit, dynamic sun, mangoes)
 * - Child Hanuman player
 * - Third-person follow camera
 * - Input controller
 * - Game state system (intro, playing, cutscenes, chapterEnd)
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

  // 4. Lighting: Sun Directional Light & Ambient Sky Fill
  const sunPosition = new THREE.Vector3(25, 38, 20);
  const sunDirection = sunPosition.clone().normalize();

  const sunLight = new THREE.DirectionalLight('#FFF7EB', 1.35);
  sunLight.position.copy(sunPosition);
  scene.add(sunLight);

  const ambientLight = new THREE.HemisphereLight(PALETTE.skyBlue, PALETTE.warmSand, 0.45);
  scene.add(ambientLight);

  // 5. Stylized Clouds
  const clouds = [];
  const cloudConfigs = [
    { x: -25, y: 22, z: -25, scale: 1.5, speed: 0.35 },
    { x: 18, y: 26, z: -35, scale: 1.8, speed: 0.28 },
    { x: 32, y: 18, z: -10, scale: 1.3, speed: 0.42 },
    { x: -32, y: 28, z: 12, scale: 1.6, speed: 0.3 },
    { x: -10, y: 30, z: -45, scale: 2.2, speed: 0.22 },
    { x: 28, y: 22, z: 28, scale: 1.4, speed: 0.38 },
  ];

  cloudConfigs.forEach((cfg) => {
    const cloud = createCloud(cfg.x, cfg.y, cfg.z, cfg.scale);
    scene.add(cloud);
    clouds.push({ group: cloud, speed: cfg.speed });
  });

  // 6. Chapter 1 Level
  const level = createChapter1Level(scene, sunDirection);

  // 7. Child Hanuman Player (starts in village at z = 10 facing north)
  const player = new Player(scene, sunDirection);
  player.position.set(0, 0, 10);

  // 8. Third-Person Follow Camera
  const thirdPersonCamera = new ThirdPersonCamera(camera, player, renderer.domElement);

  // 9. Input System
  const input = new Input(renderer.domElement);

  // 10. Game State System (intro, playing, cutscenes, chapterEnd)
  const game = new Game({
    scene,
    camera,
    player,
    thirdPersonCamera,
    input,
    level,
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
    // 1. Update player physics, collisions, and movement
    player.update(delta, input, thirdPersonCamera, level.colliders);

    // 2. Update third-person follow camera (with collider obstacle avoidance)
    thirdPersonCamera.update(delta, input, level.colliders);

    // 3. Update level (dynamic sun scaling with ascent, mango animations)
    level.update(time, delta, player.position);

    // 4. Update game state machine (intro, triggers, checkpoints, cutscenes)
    game.update(time, delta);

    // 5. Update drifting clouds
    clouds.forEach(({ group, speed }) => {
      group.position.x += speed * delta;
      if (group.position.x > 55) {
        group.position.x = -55;
      }
      group.lookAt(camera.position);
    });

    // 6. Reset instantaneous input deltas
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
    game,
    update,
    onResize,
  };
}
