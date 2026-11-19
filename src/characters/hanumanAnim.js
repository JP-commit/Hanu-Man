// src/characters/hanumanAnim.js
// Procedural animation for the rig returned by makeHanuman().
//
//   const animate = createHanumanAnimator(hanuman);
//   // every frame:
//   animate(dt, { speed, grounded, vy });
//
//   speed    : horizontal speed as a fraction of your normal run speed (0 = idle, 1 = run, ~1.5 = sprint)
//   grounded : true when standing on something
//   vy       : vertical velocity (positive going up)
//
// Covers idle (breathing, tail sway, blinking), run, jump, fall and a landing squash.
// Rotation convention: a hanging limb swings FORWARD (+Z) with a NEGATIVE rotation.x.

import { TAIL_REST, HIPS_Y, SPINE_Y } from './hanuman.js';

const clamp = (x, a, b) => Math.min(b, Math.max(a, x));
const lerp = (a, b, t) => a + (b - a) * t;
const damp = (a, b, lambda, dt) => a + (b - a) * (1 - Math.exp(-lambda * dt));

export function createHanumanAnimator(rig) {
  const { hips, spine, head, legs, arms, tail, eyes } = rig.joints;

  const st = {
    t: 0, phase: 0,
    run: 0, air: 0, land: 0,
    wasGrounded: true, lastVy: 0,
    blinkIn: 2.5, blinkLeft: 0,
  };

  return function update(dt, { speed = 0, grounded = true, vy = 0 } = {}) {
    dt = Math.min(dt, 0.05);
    st.t += dt;

    // smoothed state weights
    st.run = damp(st.run, clamp(speed, 0, 1.6), 10, dt);
    st.air = damp(st.air, grounded ? 0 : 1, 16, dt);
    if (!st.wasGrounded && grounded) st.land = clamp(Math.abs(st.lastVy) / 12 + 0.3, 0, 1);
    st.wasGrounded = grounded;
    st.lastVy = vy;
    st.land = damp(st.land, 0, 8, dt);
    st.phase += dt * (6 + st.run * 5);

    const a = st.air;                       // 0 = on ground, 1 = in air
    const run = st.run * (1 - a);           // run weight, only on the ground
    const w = clamp(0.5 + vy / 10, 0, 1);   // 1 = rising (jump), 0 = falling
    const p = st.phase;
    const s1 = Math.sin(p), c1 = Math.cos(p);
    const breath = Math.sin(st.t * 2.2);
    const streak = clamp(st.run, 0, 1.2) / 1.2;

    // ---- legs
    legs.forEach((leg, i) => {
      const sgn = i === 0 ? 1 : -1;
      const swing = s1 * sgn;
      const flex = Math.max(0, c1 * sgn);

      const gThigh = -swing * 0.85 * run;
      const gKnee = (0.12 + 0.95 * flex) * run;

      const aThigh = i === 0 ? lerp(-0.35, -0.95, w) : lerp(0.2, -0.35, w);
      const aKnee = i === 0 ? lerp(0.5, 1.3, w) : lerp(0.3, 0.6, w);

      const thigh = lerp(gThigh, aThigh, a) - 0.6 * st.land;
      const knee = lerp(gKnee, aKnee, a) + 1.2 * st.land;

      leg.hip.rotation.x = thigh;
      leg.knee.rotation.x = knee;
      leg.ankle.rotation.x = -knee * 0.3;
    });

    // ---- arms (swing opposite to the legs on the ground)
    arms.forEach((arm, i) => {
      const sgn = i === 0 ? 1 : -1;
      const swing = s1 * sgn;

      const gShoulder = swing * 0.9 * run + Math.sin(st.t * 1.7 + i * 1.5) * 0.04 * (1 - run);
      const gElbow = -(0.25 + 0.7 * run);
      const gOut = 0.1 + breath * 0.01;

      const flail = -0.7 + Math.sin(st.t * 16 + i * 2) * 0.5;
      const aShoulder = lerp(flail, -2.5, w);
      const aElbow = lerp(-0.6, -0.35, w);
      const aOut = lerp(0.8, 0.35, w);

      arm.shoulder.rotation.x = lerp(gShoulder, aShoulder, a);
      arm.shoulder.rotation.z = arm.side * lerp(gOut, aOut, a);
      arm.elbow.rotation.x = lerp(gElbow, aElbow, a);
    });

    // ---- torso, head, hips
    spine.rotation.x = 0.22 * run + a * lerp(0.1, 0.3, w) + 0.15 * st.land;
    spine.rotation.y = s1 * 0.2 * run;
    spine.position.y = SPINE_Y + breath * 0.004;
    head.rotation.x = -spine.rotation.x * 0.6;
    head.rotation.y = -spine.rotation.y * 0.7 + Math.sin(st.t * 0.7) * 0.05 * (1 - run);
    hips.position.y = HIPS_Y + Math.abs(c1) * 0.045 * run - 0.09 * st.land;
    hips.rotation.z = s1 * 0.04 * run;

    // ---- tail: streams out when running, lifts when jumping, always swaying a little
    const base = TAIL_REST.base - 0.15 * streak + a * (0.3 * w - 0.1);
    const curl = TAIL_REST.curl - 0.1 * streak;
    tail.forEach((seg, i) => {
      const wave = Math.sin(st.t * 2.4 - i * 0.55) * (0.04 + 0.07 * streak);
      seg.rotation.x = (i === 0 ? base : curl) + wave;
      seg.rotation.z = Math.sin(st.t * 1.9 - i * 0.7) * (0.05 + 0.1 * streak);
    });

    // ---- blink
    st.blinkIn -= dt;
    if (st.blinkIn <= 0) {
      st.blinkLeft = 0.12;
      st.blinkIn = 2 + Math.random() * 3.5;
    }
    if (st.blinkLeft > 0) st.blinkLeft -= dt;
    const eyeY = st.blinkLeft > 0 ? 0.12 : 1;
    eyes.forEach((e) => { e.scale.y = eyeY; });

    // ---- landing squash on the whole character
    const s = rig.baseScale;
    rig.root.scale.set(s * (1 + 0.12 * st.land), s * (1 - 0.15 * st.land), s * (1 + 0.12 * st.land));
  };
}
