import * as THREE from 'three';

/**
 * High-Quality Animation System for Bala Hanuman:
 * Supports 7 core animations with smooth weighted blending:
 * 1. Idle (natural breathing, weight shift, head movement, multi-segment S-curve tail sway)
 * 2. Walking (natural alternating steps, arm swing, torso bounce, tail rhythm)
 * 3. Running (fast sprint, arm pumping, forward body inclination, trailing tail)
 * 4. Jumping (take-off, mid-air hero pose, tucked legs, upward gaze)
 * 5. Landing (deep knee flexion, forward lean, one hand approaching ground, tail recoil)
 * 6. Climbing (body hugging vertical surface, alternating arm reach and leg pulls)
 * 7. Flying (superhero pose, outstretched arms, trailing bent legs, wind fluttering tail)
 */
export class HanumanAnimator {
  constructor(parts, isAdult = false) {
    this.parts = parts;
    this.isAdult = isAdult;

    // Animation state weights (0.0 to 1.0)
    this.weights = {
      idle: 1.0,
      walk: 0.0,
      run: 0.0,
      jump: 0.0,
      land: 0.0,
      climb: 0.0,
      fly: 0.0,
    };

    // Cycle times
    this.walkCycle = 0.0;
    this.runCycle = 0.0;
    this.climbCycle = 0.0;
    this.flyCycle = 0.0;

    // Manual override state for testing or cutscenes
    this.overrideState = null;

    // Landing timer
    this.landingTimer = 0.0;
    this.wasGrounded = true;

    // Base joint values
    this.basePelvisY = parts.pelvis.position.y;
  }

  /**
   * Sets manual animation override (e.g. 'climb', 'fly', null to resume auto physics)
   */
  setOverride(stateName) {
    this.overrideState = stateName;
  }

  update(delta, time, velocity, isGrounded, squash = 1.0) {
    const parts = this.parts;
    if (!parts) return;

    // Detect landing impact
    if (!this.wasGrounded && isGrounded && velocity.y <= 0) {
      this.landingTimer = 0.35; // 350ms landing absorption pose
    }
    this.wasGrounded = isGrounded;
    if (this.landingTimer > 0) {
      this.landingTimer -= delta;
    }

    const vx = velocity.x;
    const vy = velocity.y;
    const vz = velocity.z;
    const horizontalSpeed = Math.sqrt(vx * vx + vz * vz);

    // Determine target weights based on physics & state
    let target = {
      idle: 0.0,
      walk: 0.0,
      run: 0.0,
      jump: 0.0,
      land: 0.0,
      climb: 0.0,
      fly: 0.0,
    };

    if (this.overrideState) {
      target[this.overrideState] = 1.0;
    } else if (this.landingTimer > 0 && isGrounded) {
      target.land = Math.min(1.0, this.landingTimer / 0.35);
    } else if (!isGrounded) {
      if (vy > 6.0) {
        // High speed leap / flying towards the sun
        target.fly = Math.min(1.0, (vy - 6.0) / 6.0);
        target.jump = 1.0 - target.fly;
      } else {
        target.jump = 1.0;
      }
    } else if (horizontalSpeed > 5.5) {
      target.run = 1.0;
    } else if (horizontalSpeed > 0.4) {
      target.walk = Math.min(1.0, horizontalSpeed / 4.0);
      target.idle = 1.0 - target.walk;
    } else {
      target.idle = 1.0;
    }

    // Smoothly blend weights
    const blendSpeed = 10.0 * delta;
    for (const key of Object.keys(this.weights)) {
      this.weights[key] = THREE.MathUtils.lerp(this.weights[key], target[key], blendSpeed);
    }

    // Accumulate movement cycles
    this.walkCycle += delta * 7.5;
    this.runCycle += delta * (11.5 + Math.min(1.5, horizontalSpeed / 6.0) * 3.5);
    this.climbCycle += delta * 6.0;
    this.flyCycle += delta * 8.0;

    // Reset joint rotations
    parts.torso.rotation.set(0, 0, 0);
    parts.torso.scale.set(1, 1, 1);
    parts.head.rotation.set(0, 0, 0);
    parts.leftShoulder.rotation.set(0, 0, 0);
    parts.leftForearm.rotation.set(-0.15, 0, 0);
    parts.rightShoulder.rotation.set(0, 0, 0);
    parts.rightForearm.rotation.set(-0.15, 0, 0);
    parts.leftHip.rotation.set(0, 0, 0);
    parts.leftKnee.rotation.set(0, 0, 0);
    parts.rightHip.rotation.set(0, 0, 0);
    parts.rightKnee.rotation.set(0, 0, 0);

    let pelvisYOffset = 0;

    // ==========================================
    // 1. IDLE ANIMATION
    // ==========================================
    const wIdle = this.weights.idle;
    if (wIdle > 0.001) {
      const breath = Math.sin(time * 2.4) * 0.035;
      const weightShift = Math.sin(time * 1.2) * 0.02;
      const headNod = Math.sin(time * 1.6) * 0.03;

      parts.torso.scale.set(
        1.0 + breath * 0.6 * wIdle,
        1.0 + breath * wIdle,
        1.0 + breath * 0.7 * wIdle
      );
      parts.head.rotation.x += headNod * wIdle;
      parts.head.rotation.z += weightShift * 0.5 * wIdle;

      // Relaxed arms at sides
      parts.leftShoulder.rotation.z += (0.10 + breath * 0.05) * wIdle;
      parts.rightShoulder.rotation.z -= (0.10 + breath * 0.05) * wIdle;

      pelvisYOffset += breath * 0.02 * wIdle;

      // Natural S-curve tail sway
      parts.tailBase.rotation.x += (0.50 + Math.sin(time * 2.0) * 0.08) * wIdle;
      parts.tailBase.rotation.z += Math.sin(time * 1.6) * 0.12 * wIdle;

      parts.tailSegments.forEach((seg, i) => {
        const segPhase = time * 2.5 + i * 0.7;
        seg.rotation.x += (0.16 + Math.cos(segPhase) * 0.07) * wIdle;
        seg.rotation.z += Math.sin(segPhase) * 0.12 * wIdle;
      });
    }

    // ==========================================
    // 2. WALKING ANIMATION
    // ==========================================
    const wWalk = this.weights.walk;
    if (wWalk > 0.001) {
      const phi = this.walkCycle;

      // Legs
      parts.leftHip.rotation.x += Math.sin(phi) * 0.55 * wWalk;
      parts.rightHip.rotation.x -= Math.sin(phi) * 0.55 * wWalk;
      parts.leftKnee.rotation.x += Math.max(0, -Math.sin(phi)) * 0.65 * wWalk;
      parts.rightKnee.rotation.x += Math.max(0, Math.sin(phi)) * 0.65 * wWalk;

      // Arms (counter-swing)
      parts.leftShoulder.rotation.x -= Math.sin(phi) * 0.50 * wWalk;
      parts.rightShoulder.rotation.x += Math.sin(phi) * 0.50 * wWalk;
      parts.leftForearm.rotation.x -= Math.max(0, -Math.sin(phi)) * 0.4 * wWalk;
      parts.rightForearm.rotation.x -= Math.max(0, Math.sin(phi)) * 0.4 * wWalk;

      // Torso & Tail
      parts.torso.rotation.x += 0.08 * wWalk;
      parts.torso.rotation.y += Math.sin(phi) * 0.05 * wWalk;
      pelvisYOffset += Math.abs(Math.sin(phi * 2.0)) * 0.025 * wWalk;

      parts.tailBase.rotation.x += (0.65 + Math.sin(phi * 2.0) * 0.10) * wWalk;
      parts.tailBase.rotation.z += Math.sin(phi) * 0.15 * wWalk;
      parts.tailSegments.forEach((seg, i) => {
        seg.rotation.x += (0.18 + Math.cos(phi + i * 0.6) * 0.06) * wWalk;
        seg.rotation.z += Math.sin(phi + i * 0.6) * 0.10 * wWalk;
      });
    }

    // ==========================================
    // 3. RUNNING ANIMATION
    // ==========================================
    const wRun = this.weights.run;
    if (wRun > 0.001) {
      const phi = this.runCycle;

      // Powerful leg drives
      parts.leftHip.rotation.x += Math.sin(phi) * 0.85 * wRun;
      parts.rightHip.rotation.x -= Math.sin(phi) * 0.85 * wRun;
      parts.leftKnee.rotation.x += Math.max(0, -Math.sin(phi)) * 1.15 * wRun;
      parts.rightKnee.rotation.x += Math.max(0, Math.sin(phi)) * 1.15 * wRun;

      // Aggressive arm pumping
      parts.leftShoulder.rotation.x -= Math.sin(phi) * 0.85 * wRun;
      parts.rightShoulder.rotation.x += Math.sin(phi) * 0.85 * wRun;
      parts.leftForearm.rotation.x -= (0.25 + Math.max(0, -Math.sin(phi)) * 0.75) * wRun;
      parts.rightForearm.rotation.x -= (0.25 + Math.max(0, Math.sin(phi)) * 0.75) * wRun;

      // Forward athletic body inclination
      parts.torso.rotation.x += 0.24 * wRun;
      parts.torso.rotation.y += Math.sin(phi) * 0.08 * wRun;
      pelvisYOffset += Math.abs(Math.sin(phi * 2.0)) * 0.045 * wRun;

      // Wind-trailing tail
      parts.tailBase.rotation.x += (0.95 + Math.sin(phi * 2.0) * 0.14) * wRun;
      parts.tailBase.rotation.z += Math.sin(phi) * 0.20 * wRun;
      parts.tailSegments.forEach((seg, i) => {
        seg.rotation.x += (0.24 + Math.cos(phi + i * 0.7) * 0.08) * wRun;
        seg.rotation.z += Math.sin(phi + i * 0.7) * 0.12 * wRun;
      });
    }

    // ==========================================
    // 4. JUMPING ANIMATION
    // ==========================================
    const wJump = this.weights.jump;
    if (wJump > 0.001) {
      // Arms raised high in joyous leap
      parts.leftShoulder.rotation.x -= 2.25 * wJump;
      parts.leftShoulder.rotation.z += 0.40 * wJump;
      parts.rightShoulder.rotation.x -= 2.25 * wJump;
      parts.rightShoulder.rotation.z -= 0.40 * wJump;
      parts.leftForearm.rotation.x -= 0.45 * wJump;
      parts.rightForearm.rotation.x -= 0.45 * wJump;

      // Legs tucked up
      parts.leftHip.rotation.x += 0.45 * wJump;
      parts.leftKnee.rotation.x += 0.80 * wJump;
      parts.rightHip.rotation.x += 0.30 * wJump;
      parts.rightKnee.rotation.x += 0.65 * wJump;

      // Head looking up toward the sun
      parts.head.rotation.x -= 0.38 * wJump;

      // Upward tail arch
      parts.tailBase.rotation.x += 1.05 * wJump;
      parts.tailSegments.forEach((seg) => {
        seg.rotation.x += 0.26 * wJump;
      });
    }

    // ==========================================
    // 5. LANDING ANIMATION (Vanara 3-Point Crouch)
    // ==========================================
    const wLand = this.weights.land;
    if (wLand > 0.001) {
      // Deep knee absorption
      parts.leftHip.rotation.x += 0.75 * wLand;
      parts.leftKnee.rotation.x += 1.35 * wLand;
      parts.rightHip.rotation.x += 0.65 * wLand;
      parts.rightKnee.rotation.x += 1.25 * wLand;

      // Forward chest tilt
      parts.torso.rotation.x += 0.45 * wLand;
      pelvisYOffset -= 0.18 * wLand;

      // One hand reaching toward ground for stability
      parts.rightShoulder.rotation.x += 0.45 * wLand;
      parts.rightShoulder.rotation.z -= 0.25 * wLand;
      parts.rightForearm.rotation.x -= 0.85 * wLand;

      parts.leftShoulder.rotation.x -= 0.35 * wLand;
      parts.leftShoulder.rotation.z += 0.50 * wLand;

      // Tail recoil
      parts.tailBase.rotation.x += 1.15 * wLand;
    }

    // ==========================================
    // 6. CLIMBING ANIMATION
    // ==========================================
    const wClimb = this.weights.climb;
    if (wClimb > 0.001) {
      const phi = this.climbCycle;

      // Body pressed close to vertical surface
      parts.torso.rotation.x -= 0.35 * wClimb;

      // Alternating arm reaches
      parts.leftShoulder.rotation.x -= (2.4 + Math.sin(phi) * 0.4) * wClimb;
      parts.leftShoulder.rotation.z += 0.25 * wClimb;
      parts.rightShoulder.rotation.x -= (2.4 - Math.sin(phi) * 0.4) * wClimb;
      parts.rightShoulder.rotation.z -= 0.25 * wClimb;

      // Alternating knee grips
      parts.leftHip.rotation.x += (0.65 + Math.sin(phi) * 0.35) * wClimb;
      parts.leftKnee.rotation.x += (1.1 + Math.sin(phi) * 0.3) * wClimb;
      parts.rightHip.rotation.x += (0.65 - Math.sin(phi) * 0.35) * wClimb;
      parts.rightKnee.rotation.x += (1.1 - Math.sin(phi) * 0.3) * wClimb;

      // Tail curled down/out for balance
      parts.tailBase.rotation.x -= 0.25 * wClimb;
    }

    // ==========================================
    // 7. FLYING ANIMATION (Superhero Glide)
    // ==========================================
    const wFly = this.weights.fly;
    if (wFly > 0.001) {
      const phi = this.flyCycle;

      // Body inclined forward into flight direction
      parts.torso.rotation.x += 0.75 * wFly;
      parts.head.rotation.x -= 0.70 * wFly; // Head looks straight ahead

      // Arms outstretched forward and slightly spread
      parts.leftShoulder.rotation.x -= (2.7 + Math.sin(phi) * 0.08) * wFly;
      parts.leftShoulder.rotation.z += 0.35 * wFly;
      parts.rightShoulder.rotation.x -= (2.7 - Math.sin(phi) * 0.08) * wFly;
      parts.rightShoulder.rotation.z -= 0.35 * wFly;

      // Legs trailing behind
      parts.leftHip.rotation.x -= 0.35 * wFly;
      parts.leftKnee.rotation.x += 0.40 * wFly;
      parts.rightHip.rotation.x -= 0.25 * wFly;
      parts.rightKnee.rotation.x += 0.45 * wFly;

      // Tail & sash streaming back with fluttering wave
      parts.tailBase.rotation.x += 1.45 * wFly;
      parts.tailBase.rotation.z += Math.sin(phi * 2.0) * 0.18 * wFly;
      parts.tailSegments.forEach((seg, i) => {
        seg.rotation.x += 0.22 * wFly;
        seg.rotation.z += Math.sin(phi * 2.0 + i * 0.8) * 0.15 * wFly;
      });
    }

    // Apply net pelvis offset
    parts.pelvis.position.y = this.basePelvisY + pelvisYOffset;
  }
}
