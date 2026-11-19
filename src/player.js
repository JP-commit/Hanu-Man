import * as THREE from 'three';
import { makeHanuman } from './characters/hanuman.js';
import { createHanumanAnimator } from './characters/hanumanAnim.js';

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

    // Character model variation (Child vs Adult preview)
    this.isAdult = false;

    // Root group in scene
    this.mesh = new THREE.Group();
    this.mesh.name = 'player_root';
    this.scene.add(this.mesh);

    this.charModelGroup = null;
    this.animateCharacter = null;

    this._buildCharacterModel();
    this._attachDebugKeys();
  }

  _buildCharacterModel() {
    if (this.charModelGroup) {
      this.mesh.remove(this.charModelGroup);
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

  /**
   * Switches between Child Hanuman and Adult Hanuman (with Gada)
   */
  toggleCharacterModel() {
    this.isAdult = !this.isAdult;
    this._buildCharacterModel();
  }

  _attachDebugKeys() {
    window.addEventListener('keydown', (e) => {
      if (e.code === 'KeyK') {
        this.toggleCharacterModel();
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

    this.isGrounded = groundedThisFrame;
  }
}
