import * as THREE from 'three';
import { setupScene } from './scene.js';

const container = document.getElementById('app') || document.body;
const sceneContext = setupScene(container);

// Debug overlay elements
const debugFps = document.getElementById('debug-fps');
const debugGrounded = document.getElementById('debug-grounded');
const debugSpeed = document.getElementById('debug-speed');

const clock = new THREE.Clock();

// FPS calculation tracker
let frameCount = 0;
let lastFpsUpdate = 0;
let currentFps = 60;

function animate() {
  requestAnimationFrame(animate);

  const delta = Math.min(clock.getDelta(), 0.1);
  const time = clock.getElapsedTime();

  // 1. Update game systems (player physics, camera, clouds, input)
  sceneContext.update(time, delta);

  // 2. Render scene
  sceneContext.renderer.render(sceneContext.scene, sceneContext.camera);

  // 3. Update debug overlay (FPS, Grounded status, Speed)
  frameCount++;
  if (time - lastFpsUpdate >= 0.25) {
    currentFps = Math.round((frameCount / (time - lastFpsUpdate)));
    frameCount = 0;
    lastFpsUpdate = time;

    if (debugFps) {
      debugFps.textContent = `${currentFps}`;
    }
  }

  if (debugGrounded && sceneContext.player) {
    const isGrounded = sceneContext.player.isGrounded;
    debugGrounded.textContent = isGrounded ? 'YES' : 'NO';
    debugGrounded.className = `debug-val ${isGrounded ? 'grounded-true' : 'grounded-false'}`;
  }

  if (debugSpeed && sceneContext.player) {
    const vx = sceneContext.player.velocity.x;
    const vz = sceneContext.player.velocity.z;
    const speed = Math.sqrt(vx * vx + vz * vz);
    debugSpeed.textContent = `${speed.toFixed(1)} m/s`;
  }
}

animate();
