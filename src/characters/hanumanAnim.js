import * as THREE from 'three';

/**
 * Procedural Animation Controller for Hanuman:
 * - Idle: natural breathing, head curiosity, multi-segment S-curve tail sway
 * - Run: athletic counter-balanced arm/leg swings, elbow flex, knee recoil, forward torso lean
 * - Jump: triumphant arms raised high, tucked knees, head tilted to the sky
 * - Fall: wind-flutter flailing limbs for aerial balance
 * - Landing: knee absorption and spring-damped landing squash
 */
export class HanumanAnimator {
  constructor(parts, isAdult = false) {
    this.parts = parts;
    this.isAdult = isAdult;

    this.runCycle = 0.0;
    this.runBlend = 0.0;
    this.jumpBlend = 0.0;
    this.fallBlend = 0.0;

    // Cache initial joint positions
    this.basePelvisY = parts.pelvis.position.y;
  }

  update(delta, time, velocity, isGrounded, squash = 1.0) {
    const parts = this.parts;
    if (!parts) return;

    const vx = velocity.x;
    const vy = velocity.y;
    const vz = velocity.z;
    const horizontalSpeed = Math.sqrt(vx * vx + vz * vz);

    // Target state blends
    const targetRun = isGrounded && horizontalSpeed > 0.4 ? Math.min(1.0, horizontalSpeed / 4.5) : 0.0;
    const targetJump = !isGrounded && vy > 1.0 ? 1.0 : 0.0;
    const targetFall = !isGrounded && vy <= 1.0 ? Math.min(1.0, -vy / 5.0) : 0.0;

    // Smoothly interpolate blend weights
    const blendRate = 12.0 * delta;
    this.runBlend = THREE.MathUtils.lerp(this.runBlend, targetRun, blendRate);
    this.jumpBlend = THREE.MathUtils.lerp(this.jumpBlend, targetJump, blendRate);
    this.fallBlend = THREE.MathUtils.lerp(this.fallBlend, targetFall, blendRate);

    // Update run cycle
    const runFrequency = 11.5 + this.runBlend * 4.5;
    this.runCycle += delta * runFrequency;
    const phi = this.runCycle;

    // ==========================================
    // 1. TORSO & BREATHING
    // ==========================================
    const breath = Math.sin(time * 2.8) * 0.035;
    const forwardLean = this.runBlend * 0.22 - this.jumpBlend * 0.15;
    const torsoTwist = Math.sin(phi) * 0.08 * this.runBlend;

    parts.torso.rotation.set(forwardLean, torsoTwist, 0);
    parts.torso.scale.set(1.0 + breath * 0.7, 1.0 + breath, 1.0 + breath * 0.8);

    // Pelvis bounce during run
    const runBounce = Math.abs(Math.sin(phi * 2.0)) * 0.04 * this.runBlend;
    parts.pelvis.position.y = this.basePelvisY + breath * 0.02 + runBounce;

    // ==========================================
    // 2. HEAD
    // ==========================================
    const idleHeadTilt = Math.sin(time * 1.6) * 0.04;
    const jumpHeadLook = -this.jumpBlend * 0.35; // Look up at the sky/sun during jump
    parts.head.rotation.set(jumpHeadLook, -torsoTwist * 0.5, idleHeadTilt);

    // ==========================================
    // 3. ARMS & SHOULDERS
    // ==========================================
    // Left Arm
    const idleArmL_X = Math.sin(time * 2.2) * 0.03;
    const idleArmL_Z = 0.12 + Math.cos(time * 2.0) * 0.03;
    const runArmL_X = -Math.sin(phi) * 0.75 * this.runBlend;
    const jumpArmL_X = -2.25 * this.jumpBlend; // Raised high
    const jumpArmL_Z = 0.45 * this.jumpBlend;
    const fallArmL_X = (-1.2 + Math.sin(time * 8.0) * 0.25) * this.fallBlend;
    const fallArmL_Z = (0.55 + Math.cos(time * 7.5) * 0.20) * this.fallBlend;

    parts.leftShoulder.rotation.x = idleArmL_X + runArmL_X + jumpArmL_X + fallArmL_X;
    parts.leftShoulder.rotation.z = idleArmL_Z + jumpArmL_Z + fallArmL_Z;

    // Left Forearm (elbow flexes forward during swing)
    const runElbowL = (-0.3 - Math.max(0, -Math.sin(phi)) * 0.7) * this.runBlend;
    const jumpElbowL = -0.4 * this.jumpBlend;
    parts.leftForearm.rotation.x = -0.15 + runElbowL + jumpElbowL;

    // Right Arm (opposing phase to left arm)
    const idleArmR_X = -Math.sin(time * 2.2) * 0.03;
    const idleArmR_Z = -0.12 - Math.cos(time * 2.0) * 0.03;
    const runArmR_X = Math.sin(phi) * 0.75 * this.runBlend;
    const jumpArmR_X = -2.25 * this.jumpBlend;
    const jumpArmR_Z = -0.45 * this.jumpBlend;
    const fallArmR_X = (-1.2 + Math.cos(time * 8.0) * 0.25) * this.fallBlend;
    const fallArmR_Z = (-0.55 - Math.sin(time * 7.5) * 0.20) * this.fallBlend;

    parts.rightShoulder.rotation.x = idleArmR_X + runArmR_X + jumpArmR_X + fallArmR_X;
    parts.rightShoulder.rotation.z = idleArmR_Z + jumpArmR_Z + fallArmR_Z;

    const runElbowR = (-0.3 - Math.max(0, Math.sin(phi)) * 0.7) * this.runBlend;
    const jumpElbowR = -0.4 * this.jumpBlend;
    parts.rightForearm.rotation.x = -0.15 + runElbowR + jumpElbowR;

    // ==========================================
    // 4. LEGS & KNEES
    // ==========================================
    // Left Leg
    const runLegL_X = Math.sin(phi) * 0.75 * this.runBlend;
    const jumpLegL_X = 0.45 * this.jumpBlend; // Tucked slightly forward in air
    const fallLegL_X = (0.2 + Math.sin(time * 7.0) * 0.2) * this.fallBlend;
    parts.leftHip.rotation.x = runLegL_X + jumpLegL_X + fallLegL_X;

    // Left Knee (bends backward when leg kicks back)
    const runKneeL = Math.max(0, -Math.sin(phi)) * 0.95 * this.runBlend;
    const jumpKneeL = 0.75 * this.jumpBlend;
    parts.leftKnee.rotation.x = runKneeL + jumpKneeL;

    // Right Leg
    const runLegR_X = -Math.sin(phi) * 0.75 * this.runBlend;
    const jumpLegR_X = 0.28 * this.jumpBlend;
    const fallLegR_X = (0.2 + Math.cos(time * 7.0) * 0.2) * this.fallBlend;
    parts.rightHip.rotation.x = runLegR_X + jumpLegR_X + fallLegR_X;

    const runKneeR = Math.max(0, Math.sin(phi)) * 0.95 * this.runBlend;
    const jumpKneeR = 0.65 * this.jumpBlend;
    parts.rightKnee.rotation.x = runKneeR + jumpKneeR;

    // ==========================================
    // 5. LANDING SQUASH ABSORPTION
    // ==========================================
    if (squash < 0.96) {
      const compression = (1.0 - squash) * 1.6;
      parts.leftKnee.rotation.x += compression;
      parts.rightKnee.rotation.x += compression;
      parts.pelvis.position.y -= compression * 0.12;
      parts.leftShoulder.rotation.z += compression * 0.4;
      parts.rightShoulder.rotation.z -= compression * 0.4;
    }

    // ==========================================
    // 6. MULTI-SEGMENT CURVED TAIL ANIMATION
    // ==========================================
    if (parts.tailBase && parts.tailSegments) {
      // Idle & Run Base Pitch
      const idleBaseX = 0.52 + Math.sin(time * 2.2) * 0.08;
      const idleBaseZ = Math.sin(time * 1.8) * 0.14;
      const runBaseX = 0.88 * this.runBlend; // Trails upward & behind while running
      const jumpBaseX = 0.95 * this.jumpBlend;

      parts.tailBase.rotation.x = idleBaseX + runBaseX + jumpBaseX;
      parts.tailBase.rotation.z = idleBaseZ + Math.sin(phi) * 0.18 * this.runBlend;

      // Sequential wave propagation through tail segments (graceful monkey curl)
      parts.tailSegments.forEach((seg, i) => {
        const segPhase = time * 2.8 + i * 0.75;
        const waveX = Math.cos(segPhase) * 0.08;
        const waveZ = Math.sin(segPhase) * 0.14;

        // Inherent upward curl curve
        const baseCurlX = 0.18 + i * 0.06;
        seg.rotation.x = baseCurlX + waveX + (this.runBlend * 0.08 * i);
        seg.rotation.z = waveZ;
      });
    }
  }
}
