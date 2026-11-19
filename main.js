import * as THREE from 'three';
import { setupScene } from './scene.js';

const container = document.getElementById('app') || document.body;
const sceneContext = setupScene(container);

const clock = new THREE.Clock();

function animate() {
  requestAnimationFrame(animate);

  const delta = Math.min(clock.getDelta(), 0.1);
  const time = clock.getElapsedTime();

  sceneContext.update(time, delta);
  sceneContext.renderer.render(sceneContext.scene, sceneContext.camera);
}

animate();
