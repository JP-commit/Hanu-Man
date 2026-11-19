import * as THREE from 'three';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';
import { GLTFExporter } from 'three/examples/jsm/exporters/GLTFExporter.js';
import fs from 'fs';

// Polyfill FileReader for Node.js GLTFExporter
class NodeFileReader {
  readAsArrayBuffer(blob) {
    blob.arrayBuffer().then(buf => {
      this.result = buf;
      if (this.onloadend) this.onloadend();
    });
  }
  readAsDataURL(blob) {
    blob.arrayBuffer().then(buf => {
      const b64 = Buffer.from(buf).toString('base64');
      this.result = 'data:' + (blob.type || 'application/octet-stream') + ';base64,' + b64;
      if (this.onloadend) this.onloadend();
    });
  }
}
global.FileReader = NodeFileReader;

const loader = new GLTFLoader();

function parseGLTF(path) {
  const buf = fs.readFileSync(path);
  return new Promise((resolve, reject) => {
    loader.parse(buf.buffer.slice(buf.byteOffset, buf.byteOffset + buf.byteLength), '', resolve, reject);
  });
}

// Distance from point P to line segment AB
function distToSegment(p, a, b) {
  const ab = new THREE.Vector3().subVectors(b, a);
  const ap = new THREE.Vector3().subVectors(p, a);
  const abLenSq = ab.lengthSq();
  if (abLenSq < 1e-8) return ap.length();
  let t = ap.dot(ab) / abLenSq;
  t = Math.max(0, Math.min(1, t));
  const proj = new THREE.Vector3().copy(a).addScaledVector(ab, t);
  return p.distanceTo(proj);
}

export async function buildBalaHanuman(customJointsPath = null, outputPath = 'public/models/bala-hanuman.glb') {
  console.log('[RigBuilder] Starting build for Bala Hanuman...');

  // 1. Load Colored Mesh
  const coloredGltf = await parseGLTF('public/models/hanuman_colored.glb');
  let origMesh = null;
  coloredGltf.scene.traverse(c => {
    if (c.isMesh && !origMesh) origMesh = c;
  });
  if (!origMesh) throw new Error('No mesh found in hanuman_colored.glb');

  const geom = origMesh.geometry.clone();
  geom.computeBoundingBox();
  const vCount = geom.attributes.position.count;
  console.log(`[RigBuilder] Loaded mesh: ${vCount} vertices, bbox:`, geom.boundingBox);

  // 2. Load Animations & Template Skeleton from Idle.glb
  const idleGltf = await parseGLTF('public/models/animated/Idle.glb');
  const walkGltf = await parseGLTF('public/models/animated/Walk.glb');
  const runGltf = await parseGLTF('public/models/animated/Standard_Run.glb');
  const jumpGltf = await parseGLTF('public/models/animated/Jump.glb');

  // 3. Load Joint Landmarks
  let jointsPath = customJointsPath || 'public/models/animated/custom_joints.json';
  if (!fs.existsSync(jointsPath)) {
    console.log(`[RigBuilder] ${jointsPath} not found, falling back to true_anatomical_joints.json`);
    jointsPath = 'public/models/animated/true_anatomical_joints.json';
  }
  const rawJoints = JSON.parse(fs.readFileSync(jointsPath, 'utf8'));
  const targetWorldJoints = {};
  for (const [k, v] of Object.entries(rawJoints)) {
    targetWorldJoints[k] = new THREE.Vector3(v[0], v[1], v[2]);
  }

  // Ensure tail joints exist
  if (!targetWorldJoints.mixamorigTail1) {
    const hip = targetWorldJoints.mixamorigHips || new THREE.Vector3(0, 0.75, 0.24);
    targetWorldJoints.mixamorigTail1 = new THREE.Vector3(hip.x, hip.y - 0.05, hip.z - 0.12);
    targetWorldJoints.mixamorigTail2 = new THREE.Vector3(hip.x, hip.y + 0.15, hip.z - 0.35);
    targetWorldJoints.mixamorigTail3 = new THREE.Vector3(hip.x, hip.y + 0.35, hip.z - 0.40);
  }

  // Clone template skeleton hierarchy
  const templateScene = idleGltf.scene.clone(true);
  templateScene.updateMatrixWorld(true);

  const hipsBone = templateScene.getObjectByName('mixamorigHips');
  if (!hipsBone) throw new Error('mixamorigHips not found in template skeleton');

  // List all bones in hierarchy order
  const allBones = [];
  hipsBone.traverse(c => {
    if (c.isBone || c.name.startsWith('mixamorig')) {
      allBones.push(c);
    }
  });

  const boneMap = {};
  for (const b of allBones) {
    boneMap[b.name] = b;
  }

  // Add tail bones to hierarchy if not already present
  if (!boneMap['mixamorigTail1']) {
    const tail1 = new THREE.Bone(); tail1.name = 'mixamorigTail1';
    const tail2 = new THREE.Bone(); tail2.name = 'mixamorigTail2';
    const tail3 = new THREE.Bone(); tail3.name = 'mixamorigTail3';
    hipsBone.add(tail1);
    tail1.add(tail2);
    tail2.add(tail3);
    allBones.push(tail1, tail2, tail3);
    boneMap['mixamorigTail1'] = tail1;
    boneMap['mixamorigTail2'] = tail2;
    boneMap['mixamorigTail3'] = tail3;
  }

  // Update root hips position
  if (targetWorldJoints.mixamorigHips) {
    hipsBone.position.copy(targetWorldJoints.mixamorigHips);
  }
  templateScene.updateMatrixWorld(true);

  // Hierarchy adjustment: adjust child bone local positions to target world coordinates
  // Traverse top-down so parent world matrix is always updated before child
  function adjustBoneChain(bone) {
    for (const child of bone.children) {
      if (child.isBone || child.name.startsWith('mixamorig')) {
        const targetWp = targetWorldJoints[child.name];
        if (targetWp) {
          // Compute local position in parent space
          bone.updateWorldMatrix(true, false);
          const localPos = bone.worldToLocal(targetWp.clone());
          child.position.copy(localPos);
        }
        child.updateMatrixWorld(true);
        adjustBoneChain(child);
      }
    }
  }
  adjustBoneChain(hipsBone);
  templateScene.updateMatrixWorld(true);

  // Read final world positions of all bones
  const finalBoneWorldPos = {};
  for (const b of allBones) {
    const wp = new THREE.Vector3();
    b.getWorldPosition(wp);
    finalBoneWorldPos[b.name] = wp;
  }

  console.log('[RigBuilder] Skeleton world positions adjusted to user landmarks.');

  // 4. Compute Capsule Skin Weights
  console.log('[RigBuilder] Computing anatomical capsule skin weights...');
  const posAttr = geom.attributes.position;
  const skinIndices = new Uint16Array(vCount * 4);
  const skinWeights = new Float32Array(vCount * 4);

  // Bone segment definitions for skinning
  const segments = [
    // Spine
    { name: 'mixamorigHips', a: finalBoneWorldPos.mixamorigHips, b: finalBoneWorldPos.mixamorigSpine, radius: 0.18, group: 'center' },
    { name: 'mixamorigSpine', a: finalBoneWorldPos.mixamorigSpine, b: finalBoneWorldPos.mixamorigSpine1, radius: 0.16, group: 'center' },
    { name: 'mixamorigSpine1', a: finalBoneWorldPos.mixamorigSpine1, b: finalBoneWorldPos.mixamorigSpine2, radius: 0.16, group: 'center' },
    { name: 'mixamorigSpine2', a: finalBoneWorldPos.mixamorigSpine2, b: finalBoneWorldPos.mixamorigNeck, radius: 0.16, group: 'center' },
    { name: 'mixamorigNeck', a: finalBoneWorldPos.mixamorigNeck, b: finalBoneWorldPos.mixamorigHead, radius: 0.14, group: 'center' },
    { name: 'mixamorigHead', a: finalBoneWorldPos.mixamorigHead, b: new THREE.Vector3(finalBoneWorldPos.mixamorigHead.x, 1.45, finalBoneWorldPos.mixamorigHead.z), radius: 0.26, group: 'center' },

    // Left Arm
    { name: 'mixamorigLeftShoulder', a: finalBoneWorldPos.mixamorigSpine2, b: finalBoneWorldPos.mixamorigLeftShoulder, radius: 0.12, group: 'left_arm' },
    { name: 'mixamorigLeftArm', a: finalBoneWorldPos.mixamorigLeftShoulder, b: finalBoneWorldPos.mixamorigLeftForeArm, radius: 0.10, group: 'left_arm' },
    { name: 'mixamorigLeftForeArm', a: finalBoneWorldPos.mixamorigLeftForeArm, b: finalBoneWorldPos.mixamorigLeftHand, radius: 0.08, group: 'left_arm' },
    { name: 'mixamorigLeftHand', a: finalBoneWorldPos.mixamorigLeftHand, b: new THREE.Vector3(finalBoneWorldPos.mixamorigLeftHand.x + 0.10, finalBoneWorldPos.mixamorigLeftHand.y, finalBoneWorldPos.mixamorigLeftHand.z), radius: 0.08, group: 'left_arm' },

    // Right Arm
    { name: 'mixamorigRightShoulder', a: finalBoneWorldPos.mixamorigSpine2, b: finalBoneWorldPos.mixamorigRightShoulder, radius: 0.12, group: 'right_arm' },
    { name: 'mixamorigRightArm', a: finalBoneWorldPos.mixamorigRightShoulder, b: finalBoneWorldPos.mixamorigRightForeArm, radius: 0.10, group: 'right_arm' },
    { name: 'mixamorigRightForeArm', a: finalBoneWorldPos.mixamorigRightForeArm, b: finalBoneWorldPos.mixamorigRightHand, radius: 0.08, group: 'right_arm' },
    { name: 'mixamorigRightHand', a: finalBoneWorldPos.mixamorigRightHand, b: new THREE.Vector3(finalBoneWorldPos.mixamorigRightHand.x - 0.10, finalBoneWorldPos.mixamorigRightHand.y, finalBoneWorldPos.mixamorigRightHand.z), radius: 0.08, group: 'right_arm' },

    // Left Leg
    { name: 'mixamorigLeftUpLeg', a: finalBoneWorldPos.mixamorigLeftUpLeg, b: finalBoneWorldPos.mixamorigLeftLeg, radius: 0.12, group: 'left_leg' },
    { name: 'mixamorigLeftLeg', a: finalBoneWorldPos.mixamorigLeftLeg, b: finalBoneWorldPos.mixamorigLeftFoot, radius: 0.10, group: 'left_leg' },
    { name: 'mixamorigLeftFoot', a: finalBoneWorldPos.mixamorigLeftFoot, b: finalBoneWorldPos.mixamorigLeftToeBase, radius: 0.08, group: 'left_leg' },
    { name: 'mixamorigLeftToeBase', a: finalBoneWorldPos.mixamorigLeftToeBase, b: new THREE.Vector3(finalBoneWorldPos.mixamorigLeftToeBase.x, 0.0, finalBoneWorldPos.mixamorigLeftToeBase.z + 0.08), radius: 0.08, group: 'left_leg' },

    // Right Leg
    { name: 'mixamorigRightUpLeg', a: finalBoneWorldPos.mixamorigRightUpLeg, b: finalBoneWorldPos.mixamorigRightLeg, radius: 0.12, group: 'right_leg' },
    { name: 'mixamorigRightLeg', a: finalBoneWorldPos.mixamorigRightLeg, b: finalBoneWorldPos.mixamorigRightFoot, radius: 0.10, group: 'right_leg' },
    { name: 'mixamorigRightFoot', a: finalBoneWorldPos.mixamorigRightFoot, b: finalBoneWorldPos.mixamorigRightToeBase, radius: 0.08, group: 'right_leg' },
    { name: 'mixamorigRightToeBase', a: finalBoneWorldPos.mixamorigRightToeBase, b: new THREE.Vector3(finalBoneWorldPos.mixamorigRightToeBase.x, 0.0, finalBoneWorldPos.mixamorigRightToeBase.z + 0.08), radius: 0.08, group: 'right_leg' },

    // Tail
    { name: 'mixamorigTail1', a: finalBoneWorldPos.mixamorigTail1, b: finalBoneWorldPos.mixamorigTail2, radius: 0.10, group: 'tail' },
    { name: 'mixamorigTail2', a: finalBoneWorldPos.mixamorigTail2, b: finalBoneWorldPos.mixamorigTail3, radius: 0.10, group: 'tail' },
  ];

  // Map bone index in allBones array
  const boneIndexMap = {};
  allBones.forEach((b, idx) => {
    boneIndexMap[b.name] = idx;
  });

  const p = new THREE.Vector3();
  for (let i = 0; i < vCount; i++) {
    p.fromBufferAttribute(posAttr, i);

    // Is vertex in tail region?
    const isTail = (p.z < 0.06 && p.y < 0.85);
    // Is vertex in left / right side?
    const isLeft = (p.x > 0.04);
    const isRight = (p.x < -0.04);
    const isArm = (p.y > 0.65 && (Math.abs(p.x) > 0.16));
    const isLeg = (p.y < 0.68 && (Math.abs(p.x) > 0.03 || p.y < 0.35));

    const weights = [];

    for (const seg of segments) {
      // Segment anatomical gating
      if (isTail && seg.group !== 'tail' && seg.name !== 'mixamorigHips') continue;
      if (!isTail && seg.group === 'tail') continue;

      if (isLeft && (seg.group === 'right_arm' || seg.group === 'right_leg')) continue;
      if (isRight && (seg.group === 'left_arm' || seg.group === 'left_leg')) continue;

      if (isArm && (seg.group === 'left_leg' || seg.group === 'right_leg')) continue;
      if (isLeg && (seg.group === 'left_arm' || seg.group === 'right_arm')) continue;

      const d = distToSegment(p, seg.a, seg.b);
      const bIdx = boneIndexMap[seg.name];
      if (bIdx === undefined) continue;

      // Smooth gaussian distance weight
      const sigma = seg.radius * 1.25;
      const w = Math.exp(-(d * d) / (2 * sigma * sigma));
      if (w > 1e-4) {
        weights.push({ boneIndex: bIdx, weight: w });
      }
    }

    if (weights.length === 0) {
      // Fallback to nearest bone
      let closestBone = boneIndexMap['mixamorigHips'];
      let minDist = 999;
      for (const seg of segments) {
        const d = distToSegment(p, seg.a, seg.b);
        if (d < minDist) {
          minDist = d;
          closestBone = boneIndexMap[seg.name];
        }
      }
      weights.push({ boneIndex: closestBone, weight: 1.0 });
    }

    // Sort descending by weight, take top 4
    weights.sort((a, b) => b.weight - a.weight);
    const top4 = weights.slice(0, 4);

    // Normalize weights to sum to 1.0
    let sum = 0;
    for (const tw of top4) sum += tw.weight;
    for (let k = 0; k < 4; k++) {
      if (k < top4.length && sum > 0) {
        skinIndices[i * 4 + k] = top4[k].boneIndex;
        skinWeights[i * 4 + k] = top4[k].weight / sum;
      } else {
        skinIndices[i * 4 + k] = 0;
        skinWeights[i * 4 + k] = 0;
      }
    }
  }

  geom.setAttribute('skinIndex', new THREE.BufferAttribute(skinIndices, 4));
  geom.setAttribute('skinWeight', new THREE.BufferAttribute(skinWeights, 4));

  // 5. Build Skinned Mesh
  const skeleton = new THREE.Skeleton(allBones);
  const material = origMesh.material.clone();
  material.skinning = true;

  const skinnedMesh = new THREE.SkinnedMesh(geom, material);
  skinnedMesh.name = 'BalaHanumanSkinnedMesh';
  skinnedMesh.add(hipsBone);
  skinnedMesh.bind(skeleton);

  // 6. Retarget Animations (Locking horizontal root translation as requested)
  console.log('[RigBuilder] Retargeting animations with locked horizontal root translation...');
  const baseHipPos = finalBoneWorldPos.mixamorigHips;
  const mixamoHipY = 1.0427;
  const hipScaleY = baseHipPos.y / mixamoHipY;

  function retargetClip(sourceClip, newName) {
    const tracks = [];
    for (const track of sourceClip.tracks) {
      const parts = track.name.split('.');
      const boneName = parts[0];
      const prop = parts[1];

      if (boneMap[boneName]) {
        if (prop === 'position' && boneName === 'mixamorigHips') {
          const values = new Float32Array(track.values.length);
          for (let k = 0; k < track.values.length; k += 3) {
            // LOCK horizontal X and Z translation to rest position!
            values[k] = baseHipPos.x;
            // Scale vertical Y bobbing to character height
            values[k + 1] = baseHipPos.y + (track.values[k + 1] - mixamoHipY) * hipScaleY;
            values[k + 2] = baseHipPos.z;
          }
          tracks.push(new THREE.VectorKeyframeTrack(`${boneName}.position`, track.times, values));
        } else if (prop === 'quaternion') {
          tracks.push(track.clone());
        }
      }
    }
    return new THREE.AnimationClip(newName, sourceClip.duration, tracks);
  }

  const idleClip = retargetClip(idleGltf.animations[0], 'Idle');
  const walkClip = retargetClip(walkGltf.animations[0], 'Walk');
  const runClip = retargetClip(runGltf.animations[0], 'Run');
  const jumpClip = retargetClip(jumpGltf.animations[0], 'Jump');

  // 7. Export to GLB
  console.log(`[RigBuilder] Exporting to ${outputPath}...`);
  const exportScene = new THREE.Scene();
  exportScene.name = 'BalaHanumanScene';
  exportScene.add(skinnedMesh);

  const exporter = new GLTFExporter();
  return new Promise((resolve, reject) => {
    exporter.parse(
      exportScene,
      (gltf) => {
        fs.writeFileSync(outputPath, Buffer.from(gltf));
        const outSize = fs.statSync(outputPath).size;
        console.log(`[RigBuilder] SUCCESS! Exported ${outputPath} (${(outSize / 1024 / 1024).toFixed(2)} MB)`);
        resolve({ outputPath, size: outSize });
      },
      (err) => {
        console.error('[RigBuilder] Export failed:', err);
        reject(err);
      },
      {
        binary: true,
        animations: [idleClip, walkClip, runClip, jumpClip]
      }
    );
  });
}

// Allow direct CLI execution
if (process.argv[1]?.endsWith('build_bala_hanuman_from_joints.js')) {
  const jointsArg = process.argv[2] || 'public/models/animated/custom_joints.json';
  const outArg = process.argv[3] || 'public/models/bala-hanuman.glb';
  buildBalaHanuman(jointsArg, outArg).catch(err => {
    console.error(err);
    process.exit(1);
  });
}
