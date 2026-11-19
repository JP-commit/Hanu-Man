import * as THREE from 'three';
import { PALETTE, createToonMaterial } from '../../shaders/toon.js';
import { addOutline } from '../../shaders/outline.js';

/**
 * Creates the Hanuman character model built entirely from primitives
 * with cel-shading and inverted-hull dark-warm outlines.
 *
 * Supports both Child Hanuman (cute proportions, big expressive head, shorter limbs)
 * and Adult Hanuman (heroic broader shoulders, athletic build, warrior stance, gada mace).
 */
export function makeHanuman({ isAdult = false, sunDirection } = {}) {
  const root = new THREE.Group();
  root.name = isAdult ? 'hanuman_adult' : 'hanuman_child';

  // --- Materials ---
  const furMaterial = createToonMaterial({
    color: PALETTE.hanumanOrange,
    midColor: PALETTE.hanumanOrangeMid,
    shadowColor: PALETTE.hanumanOrangeShadow,
    lightDirection: sunDirection,
  });

  const muzzleMaterial = createToonMaterial({
    color: '#F7DCAC', // Lighter warm cream fur for snout & cheeks
    midColor: '#E2C28F',
    shadowColor: '#C49F6B',
    lightDirection: sunDirection,
  });

  const dhotiMaterial = createToonMaterial({
    color: '#FF881A', // Saffron dhoti wrap
    midColor: '#DE6E0B',
    shadowColor: '#A84B02',
    lightDirection: sunDirection,
  });

  const sashMaterial = createToonMaterial({
    color: PALETTE.terracottaRed, // Red sash
    midColor: '#B4574E',
    shadowColor: PALETTE.terracottaRedShadow,
    lightDirection: sunDirection,
  });

  const goldMaterial = createToonMaterial({
    color: '#FFD700', // Lustrous gold for ornaments, crown & gada
    midColor: '#DDAA00',
    shadowColor: '#997500',
    lightDirection: sunDirection,
  });

  const eyeWhiteMaterial = new THREE.MeshBasicMaterial({ color: '#FFFDF5' });
  const pupilMaterial = new THREE.MeshBasicMaterial({ color: '#2B150C' });
  const noseMaterial = new THREE.MeshBasicMaterial({ color: '#381F15' });

  // Proportion settings
  const p = isAdult
    ? {
        scale: 1.15,
        headScale: 1.0,
        shoulderWidth: 0.36,
        chestWidth: 0.44,
        chestDepth: 0.30,
        torsoHeight: 0.48,
        pelvisY: 0.72,
        thighLen: 0.36,
        shinLen: 0.34,
        armLen: 0.32,
        forearmLen: 0.28,
        limbRadius: 0.11,
      }
    : {
        scale: 0.95,
        headScale: 1.32, // Large cute expressive child head
        shoulderWidth: 0.24,
        chestWidth: 0.32,
        chestDepth: 0.26,
        torsoHeight: 0.36,
        pelvisY: 0.52,
        thighLen: 0.26,
        shinLen: 0.24,
        armLen: 0.24,
        forearmLen: 0.22,
        limbRadius: 0.09,
      };

  root.scale.set(p.scale, p.scale, p.scale);

  // Helper to attach outline
  function outline(mesh, thickness = 0.025) {
    addOutline(mesh, { color: PALETTE.outlineDarkWarm, thickness });
    return mesh;
  }

  // ==========================================
  // 1. PELVIS & WAIST (ROOT OF RIG)
  // ==========================================
  const pelvis = new THREE.Group();
  pelvis.name = 'pelvis';
  pelvis.position.y = p.pelvisY;
  root.add(pelvis);

  // Saffron Dhoti wrap
  const dhotiGeom = new THREE.CylinderGeometry(p.chestWidth * 0.52, p.chestWidth * 0.48, 0.24, 16);
  const dhotiMesh = outline(new THREE.Mesh(dhotiGeom, dhotiMaterial));
  pelvis.add(dhotiMesh);

  // Red waist sash knot & hanging cloth
  const sashBandGeom = new THREE.CylinderGeometry(p.chestWidth * 0.54, p.chestWidth * 0.54, 0.08, 16);
  const sashBandMesh = outline(new THREE.Mesh(sashBandGeom, sashMaterial), 0.02);
  sashBandMesh.position.y = 0.08;
  pelvis.add(sashBandMesh);

  // Hanging sash cloth at front
  const sashTailGeom = new THREE.BoxGeometry(0.12, 0.28, 0.04);
  const sashTailMesh = outline(new THREE.Mesh(sashTailGeom, sashMaterial), 0.018);
  sashTailMesh.position.set(0, -0.06, p.chestDepth * 0.54);
  sashTailMesh.rotation.x = -0.12;
  pelvis.add(sashTailMesh);

  // ==========================================
  // 2. TORSO & CHEST
  // ==========================================
  const torso = new THREE.Group();
  torso.name = 'torso';
  torso.position.y = 0.12;
  pelvis.add(torso);

  // Muscular / rounded chest
  const chestGeom = isAdult
    ? new THREE.CylinderGeometry(p.chestWidth * 0.58, p.chestWidth * 0.45, p.torsoHeight, 16)
    : new THREE.SphereGeometry(p.chestWidth * 0.55, 16, 14);
  const chestMesh = outline(new THREE.Mesh(chestGeom, furMaterial));
  chestMesh.position.y = p.torsoHeight * 0.5;
  if (!isAdult) {
    chestMesh.scale.set(1.0, 1.25, 0.95);
  }
  torso.add(chestMesh);

  // Golden necklace / royal torque around upper chest
  const neckRingGeom = new THREE.TorusGeometry(p.chestWidth * 0.32, 0.035, 8, 20);
  const neckRingMesh = outline(new THREE.Mesh(neckRingGeom, goldMaterial), 0.02);
  neckRingMesh.rotation.x = Math.PI / 2;
  neckRingMesh.position.y = p.torsoHeight * 0.88;
  torso.add(neckRingMesh);

  // ==========================================
  // 3. EXPRESSIVE VANARA HEAD
  // ==========================================
  const head = new THREE.Group();
  head.name = 'head';
  head.position.y = p.torsoHeight + 0.06;
  head.scale.set(p.headScale, p.headScale, p.headScale);
  torso.add(head);

  // Main skull (golden-orange fur)
  const skullGeom = new THREE.SphereGeometry(0.24, 18, 16);
  const skullMesh = outline(new THREE.Mesh(skullGeom, furMaterial));
  skullMesh.position.y = 0.18;
  skullMesh.scale.set(1.0, 1.05, 1.05);
  head.add(skullMesh);

  // Lighter Muzzle / Snout (vanara characteristic)
  const muzzleGeom = new THREE.SphereGeometry(0.15, 14, 12);
  const muzzleMesh = outline(new THREE.Mesh(muzzleGeom, muzzleMaterial), 0.02);
  muzzleMesh.position.set(0, 0.13, 0.16);
  muzzleMesh.scale.set(1.15, 0.85, 1.1);
  head.add(muzzleMesh);

  // Lighter cheeks
  const leftCheekGeom = new THREE.SphereGeometry(0.10, 10, 10);
  const leftCheek = outline(new THREE.Mesh(leftCheekGeom, muzzleMaterial), 0.015);
  leftCheek.position.set(0.13, 0.14, 0.12);
  head.add(leftCheek);

  const rightCheek = outline(new THREE.Mesh(leftCheekGeom, muzzleMaterial), 0.015);
  rightCheek.position.set(-0.13, 0.14, 0.12);
  head.add(rightCheek);

  // Small dark vanara nose
  const noseGeom = new THREE.ConeGeometry(0.045, 0.06, 6);
  const noseMesh = new THREE.Mesh(noseGeom, noseMaterial);
  noseMesh.rotation.x = -Math.PI / 2;
  noseMesh.position.set(0, 0.17, 0.285);
  head.add(noseMesh);

  // Simple happy mouth cleft
  const mouthGeom = new THREE.BoxGeometry(0.08, 0.02, 0.02);
  const mouthMesh = new THREE.Mesh(mouthGeom, noseMaterial);
  mouthMesh.position.set(0, 0.08, 0.26);
  head.add(mouthMesh);

  // Big expressive eyes
  const eyeGeom = new THREE.SphereGeometry(0.055, 12, 10);
  const pupilGeom = new THREE.SphereGeometry(0.032, 10, 8);

  // Left Eye
  const leftEyeWhite = new THREE.Mesh(eyeGeom, eyeWhiteMaterial);
  leftEyeWhite.position.set(0.09, 0.22, 0.20);
  leftEyeWhite.scale.set(1.0, 1.15, 0.6);
  head.add(leftEyeWhite);

  const leftPupil = new THREE.Mesh(pupilGeom, pupilMaterial);
  leftPupil.position.set(0.095, 0.22, 0.245);
  leftPupil.scale.set(0.9, 1.1, 0.5);
  head.add(leftPupil);

  // Right Eye
  const rightEyeWhite = new THREE.Mesh(eyeGeom, eyeWhiteMaterial);
  rightEyeWhite.position.set(-0.09, 0.22, 0.20);
  rightEyeWhite.scale.set(1.0, 1.15, 0.6);
  head.add(rightEyeWhite);

  const rightPupil = new THREE.Mesh(pupilGeom, pupilMaterial);
  rightPupil.position.set(-0.095, 0.22, 0.245);
  rightPupil.scale.set(0.9, 1.1, 0.5);
  head.add(rightPupil);

  // Pointed vanara ears
  const earGeom = new THREE.ConeGeometry(0.07, 0.14, 6);
  const leftEar = outline(new THREE.Mesh(earGeom, furMaterial), 0.02);
  leftEar.position.set(0.25, 0.20, -0.02);
  leftEar.rotation.z = -0.7;
  leftEar.rotation.x = -0.2;
  head.add(leftEar);

  const rightEar = outline(new THREE.Mesh(earGeom, furMaterial), 0.02);
  rightEar.position.set(-0.25, 0.20, -0.02);
  rightEar.rotation.z = 0.7;
  rightEar.rotation.x = -0.2;
  head.add(rightEar);

  // Small gold crown / royal headband
  const crownBandGeom = new THREE.CylinderGeometry(0.245, 0.245, 0.06, 16);
  const crownBand = outline(new THREE.Mesh(crownBandGeom, goldMaterial), 0.02);
  crownBand.position.y = 0.32;
  head.add(crownBand);

  // Crown crest in front
  const crestGeom = new THREE.ConeGeometry(0.08, 0.14, 4);
  const crestMesh = outline(new THREE.Mesh(crestGeom, goldMaterial), 0.02);
  crestMesh.position.set(0, 0.40, 0.20);
  crestMesh.rotation.y = Math.PI / 4;
  head.add(crestMesh);

  // ==========================================
  // 4. ARMS & HANDS
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
    const upperArmGeom = new THREE.CapsuleGeometry(p.limbRadius, p.armLen * 0.75, 10, 12);
    const upperArmMesh = outline(new THREE.Mesh(upperArmGeom, furMaterial), 0.02);
    upperArmMesh.position.y = -p.armLen * 0.5;
    shoulderGroup.add(upperArmMesh);

    // Gold Armlet
    const armletGeom = new THREE.CylinderGeometry(p.limbRadius * 1.15, p.limbRadius * 1.15, 0.06, 12);
    const armletMesh = outline(new THREE.Mesh(armletGeom, goldMaterial), 0.015);
    armletMesh.position.y = -p.armLen * 0.35;
    shoulderGroup.add(armletMesh);

    // Elbow / Forearm group
    const forearmGroup = new THREE.Group();
    forearmGroup.name = `${side}_forearm`;
    forearmGroup.position.y = -p.armLen;
    shoulderGroup.add(forearmGroup);

    const forearmGeom = new THREE.CapsuleGeometry(p.limbRadius * 0.9, p.forearmLen * 0.75, 10, 12);
    const forearmMesh = outline(new THREE.Mesh(forearmGeom, furMaterial), 0.02);
    forearmMesh.position.y = -p.forearmLen * 0.5;
    forearmGroup.add(forearmMesh);

    // Gold Bracelet
    const braceletGeom = new THREE.CylinderGeometry(p.limbRadius * 1.05, p.limbRadius * 1.05, 0.05, 12);
    const braceletMesh = outline(new THREE.Mesh(braceletGeom, goldMaterial), 0.015);
    braceletMesh.position.y = -p.forearmLen * 0.85;
    forearmGroup.add(braceletMesh);

    // Hand group
    const handGroup = new THREE.Group();
    handGroup.name = `${side}_hand`;
    handGroup.position.y = -p.forearmLen;
    forearmGroup.add(handGroup);

    const handGeom = new THREE.SphereGeometry(p.limbRadius * 1.05, 10, 10);
    const handMesh = outline(new THREE.Mesh(handGeom, furMaterial), 0.018);
    handMesh.position.y = -0.05;
    handMesh.scale.set(1.0, 1.2, 0.9);
    handGroup.add(handMesh);

    return { shoulderGroup, forearmGroup, handGroup };
  }

  const leftArm = makeArm('left');
  const rightArm = makeArm('right');

  // ==========================================
  // 5. GADA (MACE PROP) ON RIGHT HAND
  // ==========================================
  const gadaGroup = new THREE.Group();
  gadaGroup.name = 'gada_mace';

  // Mace Handle (golden fluted rod)
  const handleGeom = new THREE.CylinderGeometry(0.035, 0.035, 0.85, 10);
  const handleMesh = outline(new THREE.Mesh(handleGeom, goldMaterial), 0.018);
  handleMesh.position.y = 0.15;
  gadaGroup.add(handleMesh);

  // Mace Head (ornate ribbed bulb)
  const maceBulbGeom = new THREE.SphereGeometry(0.18, 12, 10);
  const maceBulb = outline(new THREE.Mesh(maceBulbGeom, goldMaterial), 0.025);
  maceBulb.position.y = 0.52;
  maceBulb.scale.set(1.15, 1.35, 1.15);
  gadaGroup.add(maceBulb);

  // Mace tip spike
  const maceSpikeGeom = new THREE.ConeGeometry(0.07, 0.14, 8);
  const maceSpike = outline(new THREE.Mesh(maceSpikeGeom, goldMaterial), 0.02);
  maceSpike.position.y = 0.72;
  gadaGroup.add(maceSpike);

  // Position in right hand
  gadaGroup.rotation.x = -Math.PI / 2 + 0.3;
  gadaGroup.position.set(0, -0.05, 0.1);
  rightArm.handGroup.add(gadaGroup);

  // Off for child by default, visible for adult
  gadaGroup.visible = isAdult;

  // ==========================================
  // 6. LEGS & FEET
  // ==========================================
  function makeLeg(side) {
    const isLeft = side === 'left';
    const sign = isLeft ? 1 : -1;

    // Hip joint group
    const hipGroup = new THREE.Group();
    hipGroup.name = `${side}_hip`;
    hipGroup.position.set(sign * p.chestWidth * 0.32, -0.05, 0);
    pelvis.add(hipGroup);

    // Thigh (covered in dhoti)
    const thighGeom = new THREE.CapsuleGeometry(p.limbRadius * 1.1, p.thighLen * 0.75, 10, 12);
    const thighMesh = outline(new THREE.Mesh(thighGeom, dhotiMaterial), 0.02);
    thighMesh.position.y = -p.thighLen * 0.5;
    hipGroup.add(thighMesh);

    // Knee / Shin group
    const kneeGroup = new THREE.Group();
    kneeGroup.name = `${side}_knee`;
    kneeGroup.position.y = -p.thighLen;
    hipGroup.add(kneeGroup);

    // Shin (golden fur)
    const shinGeom = new THREE.CapsuleGeometry(p.limbRadius * 0.95, p.shinLen * 0.75, 10, 12);
    const shinMesh = outline(new THREE.Mesh(shinGeom, furMaterial), 0.02);
    shinMesh.position.y = -p.shinLen * 0.5;
    kneeGroup.add(shinMesh);

    // Ankle / Foot group
    const footGroup = new THREE.Group();
    footGroup.name = `${side}_foot`;
    footGroup.position.y = -p.shinLen;
    kneeGroup.add(footGroup);

    // Foot pointing forward
    const footGeom = new THREE.BoxGeometry(p.limbRadius * 1.8, 0.08, 0.22);
    const footMesh = outline(new THREE.Mesh(footGeom, furMaterial), 0.018);
    footMesh.position.set(0, -0.04, 0.06);
    footGroup.add(footMesh);

    return { hipGroup, kneeGroup, footGroup };
  }

  const leftLeg = makeLeg('left');
  const rightLeg = makeLeg('right');

  // ==========================================
  // 7. LONG CURVED TAIL WITH CURL AT TIP
  // ==========================================
  const tailBase = new THREE.Group();
  tailBase.name = 'tail_base';
  tailBase.position.set(0, 0.02, -p.chestDepth * 0.45);
  // Default upward and backward arch
  tailBase.rotation.x = 0.55;
  pelvis.add(tailBase);

  const tailSegments = [];
  const numSegments = 5;
  const segLength = 0.18;
  let prevGroup = tailBase;

  for (let i = 0; i < numSegments; i++) {
    const segGroup = new THREE.Group();
    segGroup.name = `tail_seg_${i + 1}`;
    segGroup.position.y = i === 0 ? 0 : segLength;
    prevGroup.add(segGroup);

    const taperRadius = Math.max(0.03, (p.limbRadius * 0.7) * (1.0 - (i / numSegments) * 0.55));
    const segGeom = new THREE.CylinderGeometry(taperRadius * 0.85, taperRadius, segLength, 8);
    const segMesh = outline(new THREE.Mesh(segGeom, furMaterial), 0.015);
    segMesh.position.y = segLength * 0.5;
    segGroup.add(segMesh);

    tailSegments.push(segGroup);
    prevGroup = segGroup;
  }

  // Soft curl bulb at tail tip
  const tipGeom = new THREE.SphereGeometry(0.065, 8, 8);
  const tipMesh = outline(new THREE.Mesh(tipGeom, furMaterial), 0.018);
  tipMesh.position.y = segLength;
  prevGroup.add(tipMesh);

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
      gadaGroup,
    },
    isAdult,
    setGadaVisible(visible) {
      gadaGroup.visible = !!visible;
    },
  };
}
