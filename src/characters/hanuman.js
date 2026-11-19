import * as THREE from 'three';
import { PALETTE, createToonMaterial } from '../../shaders/toon.js';
import { addOutline } from '../../shaders/outline.js';
import {
  HANUMAN_PALETTE,
  createEyeTexture,
  createTilakMesh,
  createHairMesh,
} from './hanumanAssets.js';

/**
 * Creates the High-Quality 3D Bala Hanuman character model,
 * faithfully adhering to reference/Hanuman_Child.jpeg.
 *
 * Built from smooth organic BufferGeometry, ExtrudeGeometry, LatheGeometry, and TubeGeometry.
 * Fully animatable with modular facial expression controls.
 */
export function makeHanuman({ isAdult = false, sunDirection } = {}) {
  const root = new THREE.Group();
  root.name = isAdult ? 'hanuman_adult' : 'hanuman_bala';

  // --- Materials based on reference palette ---
  const skinMaterial = createToonMaterial({
    color: HANUMAN_PALETTE.skin,
    midColor: HANUMAN_PALETTE.skinShadow,
    shadowColor: HANUMAN_PALETTE.skinDark,
    lightDirection: sunDirection,
  });

  const muzzleMaterial = createToonMaterial({
    color: HANUMAN_PALETTE.muzzle,
    midColor: HANUMAN_PALETTE.muzzleShadow,
    shadowColor: '#CFA77C',
    lightDirection: sunDirection,
  });

  const hairMaterial = createToonMaterial({
    color: HANUMAN_PALETTE.hair,
    midColor: HANUMAN_PALETTE.hairShadow,
    shadowColor: '#1A0C06',
    lightDirection: sunDirection,
  });

  const sashOrangeMaterial = createToonMaterial({
    color: HANUMAN_PALETTE.sashOrange,
    midColor: HANUMAN_PALETTE.sashOrangeShadow,
    shadowColor: '#8E320A',
    lightDirection: sunDirection,
  });

  const dhotiCreamMaterial = createToonMaterial({
    color: HANUMAN_PALETTE.dhotiCream,
    midColor: HANUMAN_PALETTE.dhotiCreamShadow,
    shadowColor: '#BDB08E',
    lightDirection: sunDirection,
  });

  const sashCharcoalMaterial = createToonMaterial({
    color: HANUMAN_PALETTE.sashCharcoal,
    midColor: HANUMAN_PALETTE.sashCharcoalShadow,
    shadowColor: '#182028',
    lightDirection: sunDirection,
  });

  const goldMaterial = createToonMaterial({
    color: HANUMAN_PALETTE.gold,
    midColor: HANUMAN_PALETTE.goldShadow,
    shadowColor: '#785206',
    lightDirection: sunDirection,
  });

  const beadMaterial = createToonMaterial({
    color: '#8A4B29', // Rudraksha beads
    midColor: '#6B381D',
    shadowColor: '#45220F',
    lightDirection: sunDirection,
  });

  const noseMaterial = new THREE.MeshBasicMaterial({ color: HANUMAN_PALETTE.nose });
  const mouthMaterial = new THREE.MeshBasicMaterial({ color: HANUMAN_PALETTE.mouth });
  const eyeTexture = createEyeTexture();
  const eyeMaterial = new THREE.MeshBasicMaterial({ map: eyeTexture });

  // Outline helper
  function outline(mesh, thickness = 0.024) {
    addOutline(mesh, { color: PALETTE.outlineDarkWarm, thickness });
    return mesh;
  }

  // --- Proportions (Reference Image: 3.5 heads tall) ---
  const p = isAdult
    ? {
        scale: 1.15,
        headScale: 1.0,
        shoulderWidth: 0.36,
        chestWidth: 0.44,
        chestDepth: 0.32,
        torsoHeight: 0.48,
        pelvisY: 0.72,
        thighLen: 0.36,
        shinLen: 0.34,
        armLen: 0.32,
        forearmLen: 0.28,
        limbRadius: 0.11,
      }
    : {
        scale: 1.0,
        headScale: 1.25, // Expressive young hero head proportions
        shoulderWidth: 0.25,
        chestWidth: 0.34,
        chestDepth: 0.26,
        torsoHeight: 0.38,
        pelvisY: 0.52,
        thighLen: 0.26,
        shinLen: 0.24,
        armLen: 0.24,
        forearmLen: 0.22,
        limbRadius: 0.095,
      };

  root.scale.set(p.scale, p.scale, p.scale);

  // ==========================================
  // 1. PELVIS & DHOTI (LOWER BODY)
  // ==========================================
  const pelvis = new THREE.Group();
  pelvis.name = 'pelvis';
  pelvis.position.y = p.pelvisY;
  root.add(pelvis);

  // Dhoti waistband base
  const dhotiBaseGeom = new THREE.CylinderGeometry(p.chestWidth * 0.52, p.chestWidth * 0.48, 0.22, 18);
  const dhotiBase = outline(new THREE.Mesh(dhotiBaseGeom, dhotiCreamMaterial));
  pelvis.add(dhotiBase);

  // Charcoal Waist Sash with front pleated tails
  const charcoalSashGeom = new THREE.CylinderGeometry(p.chestWidth * 0.54, p.chestWidth * 0.54, 0.12, 18);
  const charcoalSash = outline(new THREE.Mesh(charcoalSashGeom, sashCharcoalMaterial), 0.02);
  charcoalSash.position.y = 0.05;
  pelvis.add(charcoalSash);

  // Vertical front sash pleats hanging down
  const frontPleatShape = new THREE.Shape();
  frontPleatShape.moveTo(-0.08, 0.08);
  frontPleatShape.lineTo(0.08, 0.08);
  frontPleatShape.lineTo(0.06, -0.32);
  frontPleatShape.lineTo(-0.06, -0.32);
  frontPleatShape.closePath();
  const frontPleatGeom = new THREE.ExtrudeGeometry(frontPleatShape, { depth: 0.04, bevelEnabled: true, bevelSize: 0.01 });
  const frontPleats = outline(new THREE.Mesh(frontPleatGeom, sashCharcoalMaterial), 0.018);
  frontPleats.position.set(0, 0, p.chestDepth * 0.52);
  frontPleats.rotation.x = -0.08;
  pelvis.add(frontPleats);

  // Golden Circular Medallion / Buckle
  const buckleGeom = new THREE.CylinderGeometry(0.075, 0.075, 0.03, 16);
  const buckleMesh = outline(new THREE.Mesh(buckleGeom, goldMaterial), 0.018);
  buckleMesh.rotation.x = Math.PI / 2;
  buckleMesh.position.set(0, 0.05, p.chestDepth * 0.55 + 0.025);
  pelvis.add(buckleMesh);

  // Inner buckle relief
  const buckleCoreGeom = new THREE.SphereGeometry(0.045, 12, 10);
  const buckleCore = new THREE.Mesh(buckleCoreGeom, goldMaterial);
  buckleCore.position.set(0, 0.05, p.chestDepth * 0.55 + 0.04);
  buckleCore.scale.set(1.0, 1.0, 0.4);
  pelvis.add(buckleCore);

  // ==========================================
  // 2. TORSO & SAFFRON CHEST SASH
  // ==========================================
  const torso = new THREE.Group();
  torso.name = 'torso';
  torso.position.y = 0.10;
  pelvis.add(torso);

  // Athletic youthful torso (bare chest with pectoral definition)
  const chestGeom = new THREE.CylinderGeometry(p.chestWidth * 0.54, p.chestWidth * 0.44, p.torsoHeight, 18);
  const chestMesh = outline(new THREE.Mesh(chestGeom, skinMaterial));
  chestMesh.position.y = p.torsoHeight * 0.5;
  chestMesh.scale.set(1.0, 1.0, 0.9);
  torso.add(chestMesh);

  // Saffron Diagonal Upper-Body Sash (wraps from left shoulder down to right waist)
  // Constructed as a contoured 3D curved band
  const sashCurve = new THREE.CatmullRomCurve3([
    new THREE.Vector3(p.shoulderWidth * 0.85, p.torsoHeight * 0.95, 0.02), // Over left shoulder
    new THREE.Vector3(p.shoulderWidth * 0.45, p.torsoHeight * 0.70, p.chestDepth * 0.55), // Across upper chest
    new THREE.Vector3(-0.02, p.torsoHeight * 0.40, p.chestDepth * 0.54), // Center chest
    new THREE.Vector3(-p.shoulderWidth * 0.65, p.torsoHeight * 0.10, p.chestDepth * 0.48), // Toward right hip
    new THREE.Vector3(-p.shoulderWidth * 0.85, 0.05, 0.0), // Under right arm/back
    new THREE.Vector3(-p.shoulderWidth * 0.35, p.torsoHeight * 0.35, -p.chestDepth * 0.50), // Across back
    new THREE.Vector3(p.shoulderWidth * 0.75, p.torsoHeight * 0.85, -p.chestDepth * 0.35), // Up back to shoulder
  ]);
  sashCurve.closed = true;

  const sashTubeGeom = new THREE.TubeGeometry(sashCurve, 36, 0.055, 8, true);
  const sashMesh = outline(new THREE.Mesh(sashTubeGeom, sashOrangeMaterial), 0.022);
  sashMesh.scale.set(1.05, 1.0, 1.05);
  torso.add(sashMesh);

  // Beaded Rudraksha necklace with gold pendant
  const beadCurve = new THREE.CatmullRomCurve3([
    new THREE.Vector3(0.14, p.torsoHeight * 0.88, 0.12),
    new THREE.Vector3(0.0, p.torsoHeight * 0.75, 0.18),
    new THREE.Vector3(-0.14, p.torsoHeight * 0.88, 0.12),
  ]);
  const beadPoints = beadCurve.getPoints(12);
  const beadGeom = new THREE.SphereGeometry(0.022, 8, 8);
  beadPoints.forEach((pt) => {
    const bead = new THREE.Mesh(beadGeom, beadMaterial);
    bead.position.copy(pt);
    torso.add(bead);
  });
  // Central gold pendant
  const pendantGeom = new THREE.CylinderGeometry(0.03, 0.03, 0.02, 10);
  const pendant = outline(new THREE.Mesh(pendantGeom, goldMaterial), 0.015);
  pendant.rotation.x = Math.PI / 2;
  pendant.position.set(0, p.torsoHeight * 0.73, 0.185);
  torso.add(pendant);

  // ==========================================
  // 3. EXPRESSIVE VANARA HEAD & FACE
  // ==========================================
  const head = new THREE.Group();
  head.name = 'head';
  head.position.y = p.torsoHeight + 0.06;
  head.scale.set(p.headScale, p.headScale, p.headScale);
  torso.add(head);

  // Boyish cranial skull
  const skullGeom = new THREE.SphereGeometry(0.26, 22, 18);
  const skullMesh = outline(new THREE.Mesh(skullGeom, skinMaterial));
  skullMesh.position.y = 0.18;
  skullMesh.scale.set(1.02, 1.05, 1.0);
  head.add(skullMesh);

  // Sculpted Lighter Cream Muzzle / Snout
  const muzzleGeom = new THREE.SphereGeometry(0.165, 18, 14);
  const muzzleMesh = outline(new THREE.Mesh(muzzleGeom, muzzleMaterial), 0.02);
  muzzleMesh.position.set(0, 0.125, 0.17);
  muzzleMesh.scale.set(1.15, 0.82, 1.15);
  head.add(muzzleMesh);

  // Rounded cheeks
  const cheekGeom = new THREE.SphereGeometry(0.12, 12, 12);
  const leftCheek = outline(new THREE.Mesh(cheekGeom, muzzleMaterial), 0.015);
  leftCheek.position.set(0.13, 0.14, 0.13);
  head.add(leftCheek);

  const rightCheek = outline(new THREE.Mesh(cheekGeom, muzzleMaterial), 0.015);
  rightCheek.position.set(-0.13, 0.14, 0.13);
  head.add(rightCheek);

  // Small dark nose
  const noseGeom = new THREE.SphereGeometry(0.042, 10, 8);
  const noseMesh = new THREE.Mesh(noseGeom, noseMaterial);
  noseMesh.position.set(0, 0.165, 0.285);
  noseMesh.scale.set(1.1, 0.8, 0.9);
  head.add(noseMesh);

  // Expressive Mouth (animated for expressions)
  const mouthGroup = new THREE.Group();
  mouthGroup.name = 'mouth_group';
  mouthGroup.position.set(0, 0.075, 0.27);
  head.add(mouthGroup);

  const mouthMeshGeom = new THREE.CylinderGeometry(0.035, 0.035, 0.015, 12);
  const mouthMesh = new THREE.Mesh(mouthMeshGeom, mouthMaterial);
  mouthMesh.rotation.x = Math.PI / 2;
  mouthGroup.add(mouthMesh);

  // Large Expressive Eyes (with eye sockets & eyelid arches)
  const eyeGeom = new THREE.SphereGeometry(0.075, 16, 14);

  // Left Eye
  const leftEyeMesh = new THREE.Mesh(eyeGeom, eyeMaterial);
  leftEyeMesh.position.set(0.10, 0.225, 0.20);
  leftEyeMesh.rotation.y = 0.22;
  leftEyeMesh.scale.set(1.0, 1.12, 0.7);
  head.add(leftEyeMesh);

  // Right Eye
  const rightEyeMesh = new THREE.Mesh(eyeGeom, eyeMaterial);
  rightEyeMesh.position.set(-0.10, 0.225, 0.20);
  rightEyeMesh.rotation.y = -0.22;
  rightEyeMesh.scale.set(1.0, 1.12, 0.7);
  head.add(rightEyeMesh);

  // Eyelids (for blinking and expressions)
  const eyelidGeom = new THREE.SphereGeometry(0.078, 16, 10, 0, Math.PI * 2, 0, Math.PI / 2);

  const leftEyelid = new THREE.Mesh(eyelidGeom, skinMaterial);
  leftEyelid.position.copy(leftEyeMesh.position);
  leftEyelid.rotation.x = -0.4;
  leftEyelid.scale.copy(leftEyeMesh.scale);
  head.add(leftEyelid);

  const rightEyelid = new THREE.Mesh(eyelidGeom, skinMaterial);
  rightEyelid.position.copy(rightEyeMesh.position);
  rightEyelid.rotation.x = -0.4;
  rightEyelid.scale.copy(rightEyeMesh.scale);
  head.add(rightEyelid);

  // Sculpted Eyebrows (animated for expressions)
  const browShape = new THREE.Shape();
  browShape.moveTo(-0.06, -0.015);
  browShape.lineTo(0.06, 0.015);
  browShape.lineTo(0.05, 0.035);
  browShape.lineTo(-0.05, 0.01);
  browShape.closePath();
  const browGeom = new THREE.ExtrudeGeometry(browShape, { depth: 0.02, bevelEnabled: true, bevelSize: 0.005 });

  const leftBrowGroup = new THREE.Group();
  leftBrowGroup.position.set(0.10, 0.31, 0.22);
  const leftBrow = new THREE.Mesh(browGeom, hairMaterial);
  leftBrowGroup.add(leftBrow);
  head.add(leftBrowGroup);

  const rightBrowGroup = new THREE.Group();
  rightBrowGroup.position.set(-0.10, 0.31, 0.22);
  const rightBrow = new THREE.Mesh(browGeom, hairMaterial);
  rightBrow.rotation.y = Math.PI;
  rightBrowGroup.add(rightBrow);
  head.add(rightBrowGroup);

  // Traditional Vaishnava Tilak on Forehead
  const tilak = createTilakMesh(sunDirection);
  tilak.position.set(0, 0.24, 0.245);
  tilak.scale.set(0.85, 0.85, 0.85);
  head.add(tilak);

  // Large Sculpted Monkey Ears
  const earOuterShape = new THREE.Shape();
  earOuterShape.moveTo(0, 0);
  earOuterShape.quadraticCurveTo(0.12, 0.16, 0.10, 0.26);
  earOuterShape.quadraticCurveTo(0.02, 0.30, -0.06, 0.18);
  earOuterShape.closePath();
  const earGeom = new THREE.ExtrudeGeometry(earOuterShape, { depth: 0.03, bevelEnabled: true, bevelSize: 0.01 });

  const leftEar = outline(new THREE.Mesh(earGeom, skinMaterial), 0.018);
  leftEar.position.set(0.24, 0.12, -0.02);
  leftEar.rotation.set(-0.1, 0.45, -0.35);
  head.add(leftEar);

  const rightEar = outline(new THREE.Mesh(earGeom, skinMaterial), 0.018);
  rightEar.position.set(-0.24, 0.12, -0.02);
  rightEar.rotation.set(-0.1, -0.45, 0.35);
  rightEar.scale.set(-1, 1, 1);
  head.add(rightEar);

  // Sculpted Hair & Topknot
  const hairMesh = createHairMesh(hairMaterial);
  head.add(hairMesh);

  // ==========================================
  // 4. ARMS, HANDS & ORNAMENTS
  // ==========================================
  function makeArm(side) {
    const isLeft = side === 'left';
    const sign = isLeft ? 1 : -1;

    // Shoulder joint group
    const shoulderGroup = new THREE.Group();
    shoulderGroup.name = `${side}_shoulder`;
    shoulderGroup.position.set(sign * p.shoulderWidth, p.torsoHeight * 0.82, 0);
    torso.add(shoulderGroup);

    // Upper arm
    const upperArmGeom = new THREE.CapsuleGeometry(p.limbRadius, p.armLen * 0.75, 12, 14);
    const upperArmMesh = outline(new THREE.Mesh(upperArmGeom, skinMaterial), 0.02);
    upperArmMesh.position.y = -p.armLen * 0.5;
    shoulderGroup.add(upperArmMesh);

    // Golden Armlet band around bicep
    const armletGeom = new THREE.CylinderGeometry(p.limbRadius * 1.15, p.limbRadius * 1.15, 0.05, 14);
    const armletMesh = outline(new THREE.Mesh(armletGeom, goldMaterial), 0.015);
    armletMesh.position.y = -p.armLen * 0.35;
    shoulderGroup.add(armletMesh);

    // Elbow / Forearm group
    const forearmGroup = new THREE.Group();
    forearmGroup.name = `${side}_forearm`;
    forearmGroup.position.y = -p.armLen;
    shoulderGroup.add(forearmGroup);

    const forearmGeom = new THREE.CapsuleGeometry(p.limbRadius * 0.9, p.forearmLen * 0.75, 12, 14);
    const forearmMesh = outline(new THREE.Mesh(forearmGeom, skinMaterial), 0.02);
    forearmMesh.position.y = -p.forearmLen * 0.5;
    forearmGroup.add(forearmMesh);

    // Golden Wristband / Bracelet
    const braceletGeom = new THREE.CylinderGeometry(p.limbRadius * 1.05, p.limbRadius * 1.05, 0.045, 14);
    const braceletMesh = outline(new THREE.Mesh(braceletGeom, goldMaterial), 0.015);
    braceletMesh.position.y = -p.forearmLen * 0.85;
    forearmGroup.add(braceletMesh);

    // Hand group (palm + 5 fingers)
    const handGroup = new THREE.Group();
    handGroup.name = `${side}_hand`;
    handGroup.position.y = -p.forearmLen;
    forearmGroup.add(handGroup);

    const palmGeom = new THREE.BoxGeometry(p.limbRadius * 1.6, 0.09, 0.07);
    const palmMesh = outline(new THREE.Mesh(palmGeom, skinMaterial), 0.016);
    palmMesh.position.y = -0.045;
    handGroup.add(palmMesh);

    // 5 Sculpted Fingers
    for (let f = 0; f < 5; f++) {
      const fingerGeom = new THREE.CapsuleGeometry(0.018, 0.05, 6, 6);
      const finger = outline(new THREE.Mesh(fingerGeom, skinMaterial), 0.012);
      if (f === 0) {
        // Thumb
        finger.position.set(sign * 0.065, -0.04, 0.02);
        finger.rotation.z = sign * 0.6;
      } else {
        // 4 fingers
        const fx = (f - 2.5) * 0.028 * sign;
        finger.position.set(fx, -0.095, 0.0);
      }
      handGroup.add(finger);
    }

    return { shoulderGroup, forearmGroup, handGroup };
  }

  const leftArm = makeArm('left');
  const rightArm = makeArm('right');

  // Optional Gada (Mace) for adult mode
  const gadaGroup = new THREE.Group();
  gadaGroup.name = 'gada_mace';
  const handleGeom = new THREE.CylinderGeometry(0.035, 0.035, 0.85, 10);
  const handleMesh = outline(new THREE.Mesh(handleGeom, goldMaterial), 0.018);
  handleMesh.position.y = 0.15;
  gadaGroup.add(handleMesh);

  const maceBulbGeom = new THREE.SphereGeometry(0.18, 14, 12);
  const maceBulb = outline(new THREE.Mesh(maceBulbGeom, goldMaterial), 0.024);
  maceBulb.position.y = 0.52;
  maceBulb.scale.set(1.15, 1.35, 1.15);
  gadaGroup.add(maceBulb);

  gadaGroup.rotation.x = -Math.PI / 2 + 0.3;
  gadaGroup.position.set(0, -0.05, 0.1);
  rightArm.handGroup.add(gadaGroup);
  gadaGroup.visible = isAdult;

  // ==========================================
  // 5. LEGS, DHOTI SHORTS & BARE FEET
  // ==========================================
  function makeLeg(side) {
    const isLeft = side === 'left';
    const sign = isLeft ? 1 : -1;

    const hipGroup = new THREE.Group();
    hipGroup.name = `${side}_hip`;
    hipGroup.position.set(sign * p.chestWidth * 0.32, -0.04, 0);
    pelvis.add(hipGroup);

    // Cream Dhoti Shorts wrap around thigh
    const dhotiLegGeom = new THREE.CylinderGeometry(p.limbRadius * 1.35, p.limbRadius * 1.55, p.thighLen * 0.85, 16);
    const dhotiLeg = outline(new THREE.Mesh(dhotiLegGeom, dhotiCreamMaterial), 0.02);
    dhotiLeg.position.y = -p.thighLen * 0.45;
    hipGroup.add(dhotiLeg);

    // Golden Embroidered Hem Border at bottom of dhoti leg
    const goldBorderGeom = new THREE.CylinderGeometry(p.limbRadius * 1.58, p.limbRadius * 1.58, 0.045, 16);
    const goldBorder = outline(new THREE.Mesh(goldBorderGeom, goldMaterial), 0.015);
    goldBorder.position.y = -p.thighLen * 0.85;
    hipGroup.add(goldBorder);

    // Knee joint & Shin
    const kneeGroup = new THREE.Group();
    kneeGroup.name = `${side}_knee`;
    kneeGroup.position.y = -p.thighLen;
    hipGroup.add(kneeGroup);

    // Bare skin shin
    const shinGeom = new THREE.CapsuleGeometry(p.limbRadius * 0.95, p.shinLen * 0.75, 12, 14);
    const shinMesh = outline(new THREE.Mesh(shinGeom, skinMaterial), 0.02);
    shinMesh.position.y = -p.shinLen * 0.5;
    kneeGroup.add(shinMesh);

    // Golden Anklet above foot
    const ankletGeom = new THREE.CylinderGeometry(p.limbRadius * 1.05, p.limbRadius * 1.05, 0.04, 14);
    const ankletMesh = outline(new THREE.Mesh(ankletGeom, goldMaterial), 0.015);
    ankletMesh.position.y = -p.shinLen * 0.88;
    kneeGroup.add(ankletMesh);

    // Foot group (bare feet with 5 defined toes)
    const footGroup = new THREE.Group();
    footGroup.name = `${side}_foot`;
    footGroup.position.y = -p.shinLen;
    kneeGroup.add(footGroup);

    // Foot arch & sole
    const footGeom = new THREE.BoxGeometry(p.limbRadius * 1.8, 0.075, 0.22);
    const footMesh = outline(new THREE.Mesh(footGeom, skinMaterial), 0.018);
    footMesh.position.set(0, -0.038, 0.06);
    footGroup.add(footMesh);

    // 5 Defined Bare Toes
    for (let t = 0; t < 5; t++) {
      const toeRadius = t === 0 ? 0.024 : 0.018;
      const toeGeom = new THREE.SphereGeometry(toeRadius, 8, 8);
      const toe = outline(new THREE.Mesh(toeGeom, skinMaterial), 0.012);
      const tx = (t - 2.0) * 0.026 * sign;
      toe.position.set(tx, -0.04, 0.17 + (t === 0 ? 0.01 : 0));
      toe.scale.set(1.0, 0.8, 1.2);
      footGroup.add(toe);
    }

    return { hipGroup, kneeGroup, footGroup };
  }

  const leftLeg = makeLeg('left');
  const rightLeg = makeLeg('right');

  // ==========================================
  // 6. LONG CURVED MONKEY TAIL WITH TUFTED TIP
  // ==========================================
  const tailBase = new THREE.Group();
  tailBase.name = 'tail_base';
  tailBase.position.set(0, 0.02, -p.chestDepth * 0.48);
  tailBase.rotation.x = 0.55;
  pelvis.add(tailBase);

  const tailSegments = [];
  const numSegments = 6;
  const segLength = 0.16;
  let prevTailParent = tailBase;

  for (let i = 0; i < numSegments; i++) {
    const segGroup = new THREE.Group();
    segGroup.name = `tail_seg_${i + 1}`;
    segGroup.position.y = i === 0 ? 0 : segLength;
    prevTailParent.add(segGroup);

    const taperRadius = Math.max(0.032, (p.limbRadius * 0.65) * (1.0 - (i / numSegments) * 0.45));
    const segGeom = new THREE.CylinderGeometry(taperRadius * 0.9, taperRadius, segLength, 10);
    const segMesh = outline(new THREE.Mesh(segGeom, skinMaterial), 0.015);
    segMesh.position.y = segLength * 0.5;
    segGroup.add(segMesh);

    tailSegments.push(segGroup);
    prevTailParent = segGroup;
  }

  // Dark-Brown Tufted Fur at Tail Tip (as in reference sheet)
  const tuftGeom = new THREE.ConeGeometry(0.085, 0.22, 10);
  const tuftMesh = outline(new THREE.Mesh(tuftGeom, hairMaterial), 0.018);
  tuftMesh.position.y = segLength + 0.08;
  tuftMesh.rotation.x = Math.PI;
  prevTailParent.add(tuftMesh);

  // ==========================================
  // 7. FACIAL EXPRESSION SYSTEM (Requirement 6)
  // ==========================================
  const expressions = {
    happy: {
      leftBrowY: 0.31,
      rightBrowY: 0.31,
      leftBrowRotZ: 0.15,
      rightBrowRotZ: -0.15,
      eyelidScaleY: 1.0,
      mouthScaleX: 1.25,
      mouthScaleY: 1.15,
    },
    determined: {
      leftBrowY: 0.28,
      rightBrowY: 0.28,
      leftBrowRotZ: -0.25,
      rightBrowRotZ: 0.25,
      eyelidScaleY: 0.65,
      mouthScaleX: 0.95,
      mouthScaleY: 0.65,
    },
    angry: {
      leftBrowY: 0.27,
      rightBrowY: 0.27,
      leftBrowRotZ: -0.42,
      rightBrowRotZ: 0.42,
      eyelidScaleY: 0.85,
      mouthScaleX: 1.35,
      mouthScaleY: 0.8,
    },
    surprised: {
      leftBrowY: 0.34,
      rightBrowY: 0.34,
      leftBrowRotZ: 0.0,
      rightBrowRotZ: 0.0,
      eyelidScaleY: 1.35,
      mouthScaleX: 0.75,
      mouthScaleY: 1.75,
    },
    focused: {
      leftBrowY: 0.295,
      rightBrowY: 0.295,
      leftBrowRotZ: -0.12,
      rightBrowRotZ: 0.12,
      eyelidScaleY: 0.85,
      mouthScaleX: 1.0,
      mouthScaleY: 0.85,
    },
  };

  let currentExpression = 'happy';

  function setExpression(name) {
    if (!expressions[name]) return;
    currentExpression = name;
    const exp = expressions[name];

    leftBrowGroup.position.y = exp.leftBrowY;
    rightBrowGroup.position.y = exp.rightBrowY;
    leftBrowGroup.rotation.z = exp.leftBrowRotZ;
    rightBrowGroup.rotation.z = exp.rightBrowRotZ;

    leftEyelid.scale.y = leftEyeMesh.scale.y * exp.eyelidScaleY;
    rightEyelid.scale.y = rightEyeMesh.scale.y * exp.eyelidScaleY;

    mouthGroup.scale.set(exp.mouthScaleX, exp.mouthScaleY, 1.0);
  }

  // Set initial default expression
  setExpression('happy');

  return {
    group: root,
    parts: {
      pelvis,
      torso,
      head,
      leftShoulder: leftArm.shoulderGroup,
      leftForearm: leftArm.forearmGroup,
      leftHand: leftArm.handGroup,
      rightShoulder: rightArm.shoulderGroup,
      rightForearm: rightArm.forearmGroup,
      rightHand: rightArm.handGroup,
      leftHip: leftLeg.hipGroup,
      leftKnee: leftLeg.kneeGroup,
      leftFoot: leftLeg.footGroup,
      rightHip: rightLeg.hipGroup,
      rightKnee: rightLeg.kneeGroup,
      rightFoot: rightLeg.footGroup,
      tailBase,
      tailSegments,
      tailTuft: tuftMesh,
      gadaGroup,
      leftBrowGroup,
      rightBrowGroup,
      leftEyelid,
      rightEyelid,
      mouthGroup,
    },
    isAdult,
    setGadaVisible(visible) {
      gadaGroup.visible = !!visible;
    },
    setExpression,
    getCurrentExpression() {
      return currentExpression;
    },
  };
}
