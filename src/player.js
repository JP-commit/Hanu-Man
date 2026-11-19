import * as THREE from 'three';
import { PALETTE, createToonMaterial } from '../shaders/toon.js';
import { addOutline } from '../shaders/outline.js';

/**
 * Child Hanuman Player Character:
 * - Smaller child proportions (capsule body + sphere head, height ~1.45m)
 * - Agile jumps (higher jump force for cliff platforming)
 * - Toon cel-shading + inverted hull outline
 * - Variable jump height, coyote time, jump buffering
 * - AABB collision separation against world colliders
 * - Cutscene animation overrides (summit leap, falling)
 */
export class Player {
  constructor(scene, sunDirection) {
    this.scene = scene;
    this.sunDirection = sunDirection;

    // Child Hanuman dimensions (smaller than adult character)
    this.radius = 0.30;
    this.height = 1.45;

    // Movement configuration (controls unchanged)
    this.walkSpeed = 6.0;
    this.sprintSpeed = 10.2;
    this.acceleration = 18.0;
    this.deceleration = 14.0;
    this.turnSpeed = 14.0;

    // Agile child jumping physics (slightly higher jumps)
    this.gravity = 24.0;
    this.jumpForce = 11.2;          // higher leap for child Hanuman
    this.coyoteDuration = 0.12;      // 120ms coyote window
    this.jumpBufferDuration = 0.16;  // 160ms buffer window

    // State
    this.velocity = new THREE.Vector3();
    this.isGrounded = true;
    this.coyoteTimer = 0.0;
    this.jumpBufferTimer = 0.0;
    this.facingAngle = 0.0;

    // Cutscene override flags
    this.isCinematic = false;

    // Squash & stretch animation values
    this.squash = 1.0;
    this.runCycle = 0.0;

    this._createMesh();
  }

  _createMesh() {
    this.mesh = new THREE.Group();
    this.mesh.name = 'child_hanuman';

    // Materials from palette
    const bodyMaterial = createToonMaterial({
      color: PALETTE.hanumanOrange,
      midColor: PALETTE.hanumanOrangeMid,
      shadowColor: PALETTE.hanumanOrangeShadow,
      lightDirection: this.sunDirection,
      thresholds: [-0.05, 0.45],
    });

    const headMaterial = createToonMaterial({
      color: PALETTE.softWhite,
      midColor: PALETTE.softWhiteMid,
      shadowColor: PALETTE.softWhiteShadow,
      lightDirection: this.sunDirection,
      thresholds: [-0.05, 0.45],
    });

    const accentMaterial = createToonMaterial({
      color: PALETTE.terracottaRed,
      midColor: '#B4574E',
      shadowColor: PALETTE.terracottaRedShadow,
      lightDirection: this.sunDirection,
    });

    // 1. Child Hanuman Capsule Body: radius 0.30m, length 0.50m (total capsule height 1.10m)
    const capsuleGeom = new THREE.CapsuleGeometry(this.radius, 0.50, 16, 24);
    this.bodyMesh = new THREE.Mesh(capsuleGeom, bodyMaterial);
    this.bodyMesh.position.y = 0.50 / 2 + this.radius;
    this.mesh.add(this.bodyMesh);

    addOutline(this.bodyMesh, {
      color: PALETTE.outlineDarkWarm,
      thickness: 0.035,
    });

    // 2. Child Head: cute proportional sphere of radius 0.25m
    const headGeom = new THREE.SphereGeometry(0.25, 20, 20);
    this.headMesh = new THREE.Mesh(headGeom, headMaterial);
    this.headMesh.position.y = 1.18;
    this.mesh.add(this.headMesh);

    addOutline(this.headMesh, {
      color: PALETTE.outlineDarkWarm,
      thickness: 0.035,
    });

    // 3. Stylized gold/terracotta child crown & headband
    const headbandGeom = new THREE.CylinderGeometry(0.26, 0.26, 0.07, 20);
    const headbandMesh = new THREE.Mesh(headbandGeom, accentMaterial);
    headbandMesh.position.y = 1.23;
    this.mesh.add(headbandMesh);

    addOutline(headbandMesh, {
      color: PALETTE.outlineDarkWarm,
      thickness: 0.025,
    });

    this.scene.add(this.mesh);
  }

  get position() {
    return this.mesh.position;
  }

  /**
   * Resets player state and teleports to target position (e.g. checkpoint)
   */
  respawn(pos) {
    this.position.copy(pos);
    this.velocity.set(0, 0, 0);
    this.isGrounded = true;
    this.coyoteTimer = 0.0;
    this.jumpBufferTimer = 0.0;
    this.isCinematic = false;
    this.mesh.scale.set(1, 1, 1);
  }

  update(delta, input, cameraController, colliders = []) {
    // During cinematics, manual movement input is suspended
    if (this.isCinematic) {
      this.position.x += this.velocity.x * delta;
      this.position.y += this.velocity.y * delta;
      this.position.z += this.velocity.z * delta;
      return;
    }

    // 1. Calculate camera-relative movement vector
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

    // Smooth horizontal acceleration & deceleration
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
      this.squash = 1.35; // stretch on launch
    }

    // Variable jump height: releasing Space early dampens upward ascent
    if (this.velocity.y > 0 && !input.actions.jump) {
      this.velocity.y -= this.gravity * 2.2 * delta;
    } else {
      this.velocity.y -= this.gravity * delta;
    }

    this.velocity.y = Math.max(this.velocity.y, -32.0);

    // 3. Collision Resolution & Position Updates
    const prevY = this.position.y;

    // Step X
    this.position.x += this.velocity.x * delta;
    this._resolveHorizontalCollisions('x', colliders);

    // Step Z
    this.position.z += this.velocity.z * delta;
    this._resolveHorizontalCollisions('z', colliders);

    // Step Y
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

    // 5. Procedural Animation (Run bob/tilt & Jump Squash/Stretch)
    this.squash = THREE.MathUtils.lerp(this.squash, 1.0, 1.0 - Math.exp(-12.0 * delta));

    if (this.isGrounded && horizontalSpeedSq > 0.5) {
      const runFrequency = isSprinting ? 17.0 : 12.0;
      this.runCycle += delta * runFrequency;
      const bob = Math.sin(this.runCycle) * 0.05;
      const tilt = Math.cos(this.runCycle) * 0.06;

      this.bodyMesh.position.y = 0.50 / 2 + this.radius + Math.abs(bob);
      this.bodyMesh.rotation.z = -tilt;
      this.mesh.scale.set(this.squash, 1 / this.squash, this.squash);
    } else {
      this.bodyMesh.position.y = 0.50 / 2 + this.radius;
      this.bodyMesh.rotation.z = 0;
      this.mesh.scale.set(1 / Math.sqrt(this.squash), this.squash, 1 / Math.sqrt(this.squash));
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
          this.velocity.z = 0;
        }
      }
    }
  }

  _resolveVerticalCollisions(prevY, colliders) {
    let groundedThisFrame = false;
    const r = this.radius * 0.9;

    // Check ground plane (y = 0)
    if (this.position.y <= 0) {
      this.position.y = 0;
      if (this.velocity.y < -4.0) {
        this.squash = 0.75;
      }
      this.velocity.y = 0;
      groundedThisFrame = true;
    }

    // Check box colliders
    for (const box of colliders) {
      const overlapsX = this.position.x + r > box.min.x && this.position.x - r < box.max.x;
      const overlapsZ = this.position.z + r > box.min.z && this.position.z - r < box.max.z;

      if (!overlapsX || !overlapsZ) continue;

      if (this.velocity.y <= 0 && this.position.y <= box.max.y) {
        if (prevY >= box.max.y - 0.3) {
          this.position.y = box.max.y;
          if (this.velocity.y < -4.0) {
            this.squash = 0.75;
          }
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
