import * as THREE from 'three';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';
import { makeHanuman } from './characters/hanuman.js';
import { createHanumanAnimator } from './characters/hanumanAnim.js';
import { addOutline } from '../shaders/outline.js';
import { PALETTE } from '../shaders/toon.js';

/**
 * Hanuman Player Character:
 * - Powered by reference/hanuman.js and reference/hanumanAnim.js
 * - Child Hanuman (default) and Adult Hanuman preview (toggled with Key K)
 * - Procedural locomotion, tail physics, blinking, jumping, and landing squash
 * - Preserves physics colliders, camera interaction, and game-state systems
 */
export class Player {
  constructor(scene, sunDirection) {
    this.scene = scene;
    this.sunDirection = sunDirection;

    // Physics collider dimensions (MUST remain unchanged)
    this.radius = 0.30;
    this.height = 1.45;

    // Movement configuration
    this.walkSpeed = 6.0;
    this.sprintSpeed = 10.2;
    this.acceleration = 18.0;
    this.deceleration = 14.0;
    this.turnSpeed = 14.0;

    // Jumping physics
    this.gravity = 24.0;
    this.jumpForce = 11.2;
    this.coyoteDuration = 0.12;
    this.jumpBufferDuration = 0.16;

    // State
    this.velocity = new THREE.Vector3();
    this.isGrounded = true;
    this.coyoteTimer = 0.0;
    this.jumpBufferTimer = 0.0;
    this.facingAngle = 0.0;

    this.isCinematic = false;
    this.squash = 1.0;

    // Character model variation:
    // useHunyuanMesh = true loads the AI-reconstructed Hunyuan3D model
    // togglable via 'M' key; 'K' toggles Child vs Adult procedural model
    this.useHunyuanMesh = true;
    this.isAdult = false;
    this.hunyuanLoaded = false;
    this.hunyuanModelCached = null;
    this.hunyuanScale = new THREE.Vector3(1, 1, 1);
    this.hunyuanOffset = new THREE.Vector3(0, 0, 0);

    // Root group in scene
    this.mesh = new THREE.Group();
    this.mesh.name = 'player_root';
    this.scene.add(this.mesh);

    this.charModelGroup = null;
    this.animateCharacter = null;

    this._buildCharacterModel();
    this._loadHunyuanModel();
    this._attachDebugKeys();
  }

  _buildCharacterModel() {
    if (this.charModelGroup) {
      this.mesh.remove(this.charModelGroup);
    }

    if (this.useHunyuanMesh && this.hunyuanLoaded) {
      this._mountHunyuanModel();
      return;
    }

    const variant = this.isAdult ? 'adult' : 'child';
    const hanuman = makeHanuman({
      variant,
      scale: 1.0,
    });

    this.characterData = hanuman;
    this.animateCharacter = createHanumanAnimator(hanuman);
    this.charModelGroup = hanuman.root;

    this.mesh.add(this.charModelGroup);
  }

  _mountHunyuanModel() {
    if (this.charModelGroup) {
      this.mesh.remove(this.charModelGroup);
    }

    const container = new THREE.Group();
    container.name = 'hunyuan_character_container';

    // Clone character model hierarchy
    const modelInstance = this.hunyuanModelCached.clone(true);
    modelInstance.position.copy(this.hunyuanOffset);
    container.add(modelInstance);

    this.charModelGroup = container;
    this.mesh.add(this.charModelGroup);

    // Setup Skeletal Animation Mixer
    if (this.hunyuanAnimations && this.hunyuanAnimations.length > 0) {
      const mixer = new THREE.AnimationMixer(modelInstance);
      this.hunyuanMixer = mixer;

      const actions = {};
      for (const anim of this.hunyuanAnimations) {
        const action = mixer.clipAction(anim);
        actions[anim.name] = action;
      }
      this.hunyuanActions = actions;

      // Start with Idle
      let currentAction = actions['Idle'] || actions['Walk'] || actions['Run'] || Object.values(actions)[0];
      if (currentAction) {
        currentAction.play();
      }

      this.animateCharacter = (delta, state) => {
        if (!this.hunyuanMixer) return;

        // Choose appropriate animation state based on gameplay physics
        let targetActionName = 'Idle';
        if (!state.grounded) {
          targetActionName = 'Jump';
        } else if (state.speed > 0.55) {
          targetActionName = 'Run';
        } else if (state.speed > 0.05) {
          targetActionName = 'Walk';
        } else {
          targetActionName = 'Idle';
        }

        const targetAction = this.hunyuanActions[targetActionName];
        if (targetAction && targetAction !== currentAction) {
          targetAction.reset();
          targetAction.fadeIn(0.18);
          targetAction.play();
          if (currentAction) {
            currentAction.fadeOut(0.18);
          }
          currentAction = targetAction;
        }

        // Adjust locomotion cadence dynamically with movement speed
        if (currentAction) {
          if (targetActionName === 'Run') {
            currentAction.timeScale = Math.max(0.8, Math.min(1.5, state.speed / 1.0));
          } else if (targetActionName === 'Walk') {
            currentAction.timeScale = Math.max(0.8, Math.min(1.3, state.speed / 0.4));
          } else {
            currentAction.timeScale = 1.0;
          }
        }

        // Squash & stretch recovery
        this.squash = THREE.MathUtils.lerp(this.squash, 1.0, 10.0 * delta);
        container.scale.y = this.squash;

        // Subtle forward lean during locomotion
        if (state.grounded && state.speed > 0.05) {
          container.rotation.x = THREE.MathUtils.lerp(container.rotation.x, 0.08, 8.0 * delta);
        } else {
          container.rotation.x = THREE.MathUtils.lerp(container.rotation.x, 0.0, 8.0 * delta);
        }

        this.hunyuanMixer.update(delta);
      };
    } else {
      // Fallback procedural animation
      let animTime = 0;
      this.animateCharacter = (delta, state) => {
        animTime += delta;
        this.squash = THREE.MathUtils.lerp(this.squash, 1.0, 10.0 * delta);
        container.scale.y = this.squash;
        if (state.grounded && state.speed > 0.05) {
          container.position.y = Math.abs(Math.sin(animTime * 10)) * 0.03;
        } else {
          container.position.y = 0;
        }
      };
    }
  }

  _loadHunyuanModel() {
    const loader = new GLTFLoader();
    loader.load('/models/animated/hanuman_animated_colored.glb', (gltf) => {
      const model = gltf.scene;

      // Model is already calibrated to 1.45m height, center feet at y = 0
      this.hunyuanOffset = new THREE.Vector3(0, 0, 0);

      model.traverse((child) => {
        if (child.isMesh) {
          child.geometry.computeVertexNormals();
          child.castShadow = true;
          child.receiveShadow = true;
          if (child.material) {
            child.material.vertexColors = true;
            child.material.roughness = 0.55;
            child.material.metalness = 0.1;
          }
        }
      });

      this.hunyuanModelCached = model;
      this.hunyuanAnimations = gltf.animations || [];
      this.hunyuanLoaded = true;

      console.log('Rigged & Animated Colored Hanuman model loaded with animations:', this.hunyuanAnimations.map(a => a.name));

      if (this.useHunyuanMesh) {
        this._buildCharacterModel();
      }
    }, undefined, (err) => {
      console.warn('Could not load animated colored Hanuman model, trying static fallback:', err);
      loader.load('/models/hanuman_colored.glb', (fallbackGltf) => {
        this.hunyuanModelCached = fallbackGltf.scene;
        this.hunyuanAnimations = [];
        this.hunyuanLoaded = true;
        if (this.useHunyuanMesh) this._buildCharacterModel();
      });
    });
  }

  toggleHunyuanMesh() {
    this.useHunyuanMesh = !this.useHunyuanMesh;
    this._buildCharacterModel();
  }

  toggleCharacterModel() {
    this.useHunyuanMesh = false;
    this.isAdult = !this.isAdult;
    this._buildCharacterModel();
  }

  getModelName() {
    if (this.useHunyuanMesh && this.hunyuanLoaded) {
      return 'Child Hanuman (Colored, Rigged & Animated)';
    }
    return this.isAdult ? 'Procedural Adult' : 'Procedural Child';
  }

  _attachDebugKeys() {
    window.addEventListener('keydown', (e) => {
      if (e.code === 'KeyK') {
        this.toggleCharacterModel();
      }
      if (e.code === 'KeyM') {
        this.toggleHunyuanMesh();
      }
    });
  }

  get position() {
    return this.mesh.position;
  }

  respawn(pos) {
    this.position.copy(pos);
    this.velocity.set(0, 0, 0);
    this.isGrounded = true;
    this.coyoteTimer = 0.0;
    this.jumpBufferTimer = 0.0;
    this.isCinematic = false;
  }

  update(delta, input, cameraController, colliders = []) {
    // In cutscenes, manual controls are suspended
    if (this.isCinematic) {
      this.position.x += this.velocity.x * delta;
      this.position.y += this.velocity.y * delta;
      this.position.z += this.velocity.z * delta;

      if (this.animateCharacter) {
        this.animateCharacter(delta, {
          speed: 0,
          grounded: this.isGrounded,
          vy: this.velocity.y,
        });
      }
      return;
    }

    // 1. Camera-relative movement input (logic unchanged)
    const forward = cameraController.getHorizontalForward();
    const right = cameraController.getHorizontalRight();

    const inputDir = new THREE.Vector3();
    if (input.axes.moveY !== 0) {
      inputDir.addScaledVector(forward, input.axes.moveY);
    }
    if (input.axes.moveX !== 0) {
      inputDir.addScaledVector(right, input.axes.moveX);
    }

    const hasInput = inputDir.lengthSq() > 0.001;
    if (hasInput) {
      inputDir.normalize();
    }

    const isSprinting = input.actions.sprint;
    const targetSpeed = hasInput ? (isSprinting ? this.sprintSpeed : this.walkSpeed) : 0.0;
    const targetVelX = inputDir.x * targetSpeed;
    const targetVelZ = inputDir.z * targetSpeed;

    const accelRate = hasInput ? this.acceleration : this.deceleration;
    const lerpFactor = 1.0 - Math.exp(-accelRate * delta);
    this.velocity.x = THREE.MathUtils.lerp(this.velocity.x, targetVelX, lerpFactor);
    this.velocity.z = THREE.MathUtils.lerp(this.velocity.z, targetVelZ, lerpFactor);

    // 2. Jump Buffering and Coyote Time
    if (this.isGrounded) {
      this.coyoteTimer = this.coyoteDuration;
    } else {
      this.coyoteTimer -= delta;
    }

    if (input.actions.jumpJustPressed) {
      this.jumpBufferTimer = this.jumpBufferDuration;
    } else {
      this.jumpBufferTimer -= delta;
    }

    if (this.jumpBufferTimer > 0 && this.coyoteTimer > 0) {
      this.velocity.y = this.jumpForce;
      this.isGrounded = false;
      this.coyoteTimer = 0.0;
      this.jumpBufferTimer = 0.0;
    }

    // Variable jump height
    if (this.velocity.y > 0 && !input.actions.jump) {
      this.velocity.y -= this.gravity * 2.2 * delta;
    } else {
      this.velocity.y -= this.gravity * delta;
    }

    this.velocity.y = Math.max(this.velocity.y, -32.0);

    // 3. Collision Resolution & Position Updates
    const prevY = this.position.y;

    this.position.x += this.velocity.x * delta;
    this._resolveHorizontalCollisions('x', colliders);

    this.position.z += this.velocity.z * delta;
    this._resolveHorizontalCollisions('z', colliders);

    this.position.y += this.velocity.y * delta;
    this._resolveVerticalCollisions(prevY, colliders);

    // 4. Smooth Rotation to face movement direction
    const horizontalSpeedSq = this.velocity.x * this.velocity.x + this.velocity.z * this.velocity.z;
    if (horizontalSpeedSq > 0.04) {
      const targetAngle = Math.atan2(this.velocity.x, this.velocity.z);
      let diff = targetAngle - this.facingAngle;
      while (diff < -Math.PI) diff += Math.PI * 2;
      while (diff > Math.PI) diff -= Math.PI * 2;

      this.facingAngle += diff * (1.0 - Math.exp(-this.turnSpeed * delta));
      this.mesh.rotation.y = this.facingAngle;
    }

    // 5. Procedural Animation Update (from reference/hanumanAnim.js)
    if (this.animateCharacter) {
      const horizontalSpeed = Math.sqrt(horizontalSpeedSq);
      const speedFraction = horizontalSpeed / this.walkSpeed;

      this.animateCharacter(delta, {
        speed: speedFraction,
        grounded: this.isGrounded,
        vy: this.velocity.y,
      });
    }
  }

  _resolveHorizontalCollisions(axis, colliders) {
    const r = this.radius;
    const feetY = this.position.y;
    const headY = this.position.y + this.height;

    const bottomCheck = feetY + 0.10;
    const topCheck = headY - 0.05;

    for (const box of colliders) {
      if (topCheck <= box.min.y || bottomCheck >= box.max.y) {
        continue;
      }

      const minX = this.position.x - r;
      const maxX = this.position.x + r;
      const minZ = this.position.z - r;
      const maxZ = this.position.z + r;

      const overlapsX = maxX > box.min.x && minX < box.max.x;
      const overlapsZ = maxZ > box.min.z && minZ < box.max.z;

      if (overlapsX && overlapsZ) {
        if (axis === 'x') {
          if (this.velocity.x > 0) {
            this.position.x = box.min.x - r;
          } else if (this.velocity.x < 0) {
            this.position.x = box.max.x + r;
          }
          this.velocity.x = 0;
        } else if (axis === 'z') {
          if (this.velocity.z > 0) {
            this.position.z = box.min.z - r;
          } else if (this.velocity.z < 0) {
            this.position.z = box.max.z + r;
          }
          this.velocity.x = 0;
        }
      }
    }
  }

  _resolveVerticalCollisions(prevY, colliders) {
    let groundedThisFrame = false;
    const r = this.radius * 0.9;

    if (this.position.y <= 0) {
      this.position.y = 0;
      this.velocity.y = 0;
      groundedThisFrame = true;
    }

    for (const box of colliders) {
      const overlapsX = this.position.x + r > box.min.x && this.position.x - r < box.max.x;
      const overlapsZ = this.position.z + r > box.min.z && this.position.z - r < box.max.z;

      if (!overlapsX || !overlapsZ) continue;

      if (this.velocity.y <= 0 && this.position.y <= box.max.y) {
        if (prevY >= box.max.y - 0.3) {
          this.position.y = box.max.y;
          this.velocity.y = 0;
          groundedThisFrame = true;
        }
      } else if (this.velocity.y > 0 && this.position.y + this.height >= box.min.y) {
        if (prevY + this.height <= box.min.y + 0.3) {
          this.position.y = box.min.y - this.height;
          this.velocity.y = 0;
        }
      }
    }

    if (!this.isGrounded && groundedThisFrame) {
      this.squash = 0.85;
    }

    this.isGrounded = groundedThisFrame;
  }
}
