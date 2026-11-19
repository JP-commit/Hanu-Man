import * as THREE from 'three';
import { PALETTE, createToonMaterial } from '../shaders/toon.js';
import { addOutline } from '../shaders/outline.js';

/**
 * Player character controller with physics, variable jumping, coyote time,
 * jump buffering, AABB collision resolution, and smooth facing rotation.
 */
export class Player {
  constructor(scene, sunDirection) {
    this.scene = scene;
    this.sunDirection = sunDirection;

    // Dimensions
    this.radius = 0.35;
    this.height = 1.85;

    // Movement configuration
    this.walkSpeed = 6.0;
    this.sprintSpeed = 10.5;
    this.acceleration = 18.0;
    this.deceleration = 14.0;
    this.turnSpeed = 14.0;

    // Jump & Gravity configuration
    this.gravity = 24.0;
    this.jumpForce = 9.8;
    this.coyoteDuration = 0.10;   // 100ms window
    this.jumpBufferDuration = 0.15; // 150ms window

    // State
    this.velocity = new THREE.Vector3();
    this.isGrounded = true;
    this.coyoteTimer = 0.0;
    this.jumpBufferTimer = 0.0;
    this.facingAngle = 0.0;

    // Squash & stretch animation values
    this.squash = 1.0;
    this.runCycle = 0.0;

    this._createMesh();
  }

  _createMesh() {
    this.mesh = new THREE.Group();
    this.mesh.name = 'player';

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

    // 1. Capsule Body: radius 0.35m, cylinder length 0.65m (total capsule height 1.35m)
    const capsuleGeom = new THREE.CapsuleGeometry(this.radius, 0.65, 16, 24);
    this.bodyMesh = new THREE.Mesh(capsuleGeom, bodyMaterial);
    // Center capsule so its bottom is at y = 0
    this.bodyMesh.position.y = 0.65 / 2 + this.radius;
    this.mesh.add(this.bodyMesh);

    addOutline(this.bodyMesh, {
      color: PALETTE.outlineDarkWarm,
      thickness: 0.035,
    });

    // 2. Head: Sphere of radius 0.28m resting on top of capsule
    const headGeom = new THREE.SphereGeometry(0.28, 20, 20);
    this.headMesh = new THREE.Mesh(headGeom, headMaterial);
    this.headMesh.position.y = 1.48;
    this.mesh.add(this.headMesh);

    addOutline(this.headMesh, {
      color: PALETTE.outlineDarkWarm,
      thickness: 0.035,
    });

    // 3. Small stylized orange/terracotta headband / accent crown
    const headbandGeom = new THREE.CylinderGeometry(0.29, 0.29, 0.08, 20);
    const headbandMesh = new THREE.Mesh(headbandGeom, accentMaterial);
    headbandMesh.position.y = 1.54;
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

  update(delta, input, cameraController, colliders = []) {
    // 1. Calculate camera-relative movement input vector
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

    // Determine target speed
    const isSprinting = input.actions.sprint;
    const targetSpeed = hasInput ? (isSprinting ? this.sprintSpeed : this.walkSpeed) : 0.0;
    const targetVelX = inputDir.x * targetSpeed;
    const targetVelZ = inputDir.z * targetSpeed;

    // Smooth horizontal acceleration / braking
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

    // Trigger jump if buffered input is active and within coyote window
    if (this.jumpBufferTimer > 0 && this.coyoteTimer > 0) {
      this.velocity.y = this.jumpForce;
      this.isGrounded = false;
      this.coyoteTimer = 0.0;
      this.jumpBufferTimer = 0.0;
      this.squash = 1.35; // stretch on launch
    }

    // Variable jump height: if Space is released early while ascending, damp vertical speed
    if (this.velocity.y > 0 && !input.actions.jump) {
      this.velocity.y -= this.gravity * 2.2 * delta;
    } else {
      this.velocity.y -= this.gravity * delta;
    }

    // Clamp terminal fall speed
    this.velocity.y = Math.max(this.velocity.y, -32.0);

    // 3. Collision Resolution & Position Update
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
      // Shortest angular difference
      let diff = targetAngle - this.facingAngle;
      while (diff < -Math.PI) diff += Math.PI * 2;
      while (diff > Math.PI) diff -= Math.PI * 2;

      this.facingAngle += diff * (1.0 - Math.exp(-this.turnSpeed * delta));
      this.mesh.rotation.y = this.facingAngle;
    }

    // 5. Procedural Animation (Subtle Run Cycle & Jump Squash/Stretch)
    this.squash = THREE.MathUtils.lerp(this.squash, 1.0, 1.0 - Math.exp(-12.0 * delta));

    if (this.isGrounded && horizontalSpeedSq > 0.5) {
      const runFrequency = isSprinting ? 16.0 : 11.0;
      this.runCycle += delta * runFrequency;
      const bob = Math.sin(this.runCycle) * 0.06;
      const tilt = Math.cos(this.runCycle) * 0.05;

      this.bodyMesh.position.y = 0.65 / 2 + this.radius + Math.abs(bob);
      this.bodyMesh.rotation.z = -tilt;
      this.mesh.scale.set(this.squash, 1 / this.squash, this.squash);
    } else {
      this.bodyMesh.position.y = 0.65 / 2 + this.radius;
      this.bodyMesh.rotation.z = 0;
      this.mesh.scale.set(1 / Math.sqrt(this.squash), this.squash, 1 / Math.sqrt(this.squash));
    }
  }

  _resolveHorizontalCollisions(axis, colliders) {
    const r = this.radius;
    const feetY = this.position.y;
    const headY = this.position.y + this.height;

    // Small clearance so ground or platform floor isn't treated as a wall
    const bottomCheck = feetY + 0.10;
    const topCheck = headY - 0.05;

    for (const box of colliders) {
      // Check vertical overlap
      if (topCheck <= box.min.y || bottomCheck >= box.max.y) {
        continue;
      }

      // Check current AABB bounds
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

    // 1. Check ground plane (y = 0)
    if (this.position.y <= 0) {
      this.position.y = 0;
      if (this.velocity.y < -4.0) {
        this.squash = 0.75; // Squash on hard landing
      }
      this.velocity.y = 0;
      groundedThisFrame = true;
    }

    // 2. Check box colliders
    for (const box of colliders) {
      // Must overlap in horizontal footprint
      const overlapsX = this.position.x + r > box.min.x && this.position.x - r < box.max.x;
      const overlapsZ = this.position.z + r > box.min.z && this.position.z - r < box.max.z;

      if (!overlapsX || !overlapsZ) continue;

      // Landing on top of box: falling down and feet passed below box top
      if (this.velocity.y <= 0 && this.position.y <= box.max.y) {
        // Was feet previously above the platform?
        if (prevY >= box.max.y - 0.25) {
          this.position.y = box.max.y;
          if (this.velocity.y < -4.0) {
            this.squash = 0.75;
          }
          this.velocity.y = 0;
          groundedThisFrame = true;
        }
      }
      // Hitting head on bottom of box: ascending and head enters box bottom
      else if (this.velocity.y > 0 && this.position.y + this.height >= box.min.y) {
        if (prevY + this.height <= box.min.y + 0.25) {
          this.position.y = box.min.y - this.height;
          this.velocity.y = 0;
        }
      }
    }

    this.isGrounded = groundedThisFrame;
  }
}
