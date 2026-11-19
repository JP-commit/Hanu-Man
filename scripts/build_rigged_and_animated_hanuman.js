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

async function build() {
  console.log('1. Loading colored Hanuman mesh and animation files...');
  const coloredGltf = await parseGLTF('public/models/hanuman_colored.glb');
  const idleGltf = await parseGLTF('public/models/animated/Idle.glb');
  const walkGltf = await parseGLTF('public/models/animated/Walk.glb');
  const runGltf = await parseGLTF('public/models/animated/Standard_Run.glb');
  const jumpGltf = await parseGLTF('public/models/animated/Jump.glb');

  let origMesh = null;
  coloredGltf.scene.traverse(c => {
    if (c.isMesh && !origMesh) origMesh = c;
  });
  if (!origMesh) throw new Error('No mesh found in hanuman_colored.glb');

  const geom = origMesh.geometry.clone();
  geom.computeBoundingBox();
  console.log('Mesh bbox:', geom.boundingBox);
  console.log('Vertex count:', geom.attributes.position.count);
  console.log('Has vertex colors:', !!geom.attributes.color);

  const targetHeight = 1.45;

  // Read True Anatomical Joints
  const jointsRaw = JSON.parse(fs.readFileSync('public/models/animated/true_anatomical_joints.json'));
  const joints = {};
  for (const [k, v] of Object.entries(jointsRaw)) {
    joints[k] = new THREE.Vector3(v[0], v[1], v[2]);
  }

  console.log('Anatomical joints sample:');
  console.log('  Hips:', joints.mixamorigHips);
  console.log('  Head:', joints.mixamorigHead);
  console.log('  LeftFoot:', joints.mixamorigLeftFoot);
  console.log('  RightFoot:', joints.mixamorigRightFoot);

  // Mixamo Bone Hierarchy definition
  const boneDefs = [
    { name: 'mixamorigHips', parent: null, side: 'center' },
    { name: 'mixamorigSpine', parent: 'mixamorigHips', side: 'center' },
    { name: 'mixamorigSpine1', parent: 'mixamorigSpine', side: 'center' },
    { name: 'mixamorigSpine2', parent: 'mixamorigSpine1', side: 'center' },
    { name: 'mixamorigNeck', parent: 'mixamorigSpine2', side: 'center' },
    { name: 'mixamorigHead', parent: 'mixamorigNeck', side: 'center' },

    // Left Arm
    { name: 'mixamorigLeftShoulder', parent: 'mixamorigSpine2', side: 'left' },
    { name: 'mixamorigLeftArm', parent: 'mixamorigLeftShoulder', side: 'left' },
    { name: 'mixamorigLeftForeArm', parent: 'mixamorigLeftArm', side: 'left' },
    { name: 'mixamorigLeftHand', parent: 'mixamorigLeftForeArm', side: 'left' },

    // Right Arm
    { name: 'mixamorigRightShoulder', parent: 'mixamorigSpine2', side: 'right' },
    { name: 'mixamorigRightArm', parent: 'mixamorigRightShoulder', side: 'right' },
    { name: 'mixamorigRightForeArm', parent: 'mixamorigRightArm', side: 'right' },
    { name: 'mixamorigRightHand', parent: 'mixamorigRightForeArm', side: 'right' },

    // Left Leg
    { name: 'mixamorigLeftUpLeg', parent: 'mixamorigHips', side: 'left' },
    { name: 'mixamorigLeftLeg', parent: 'mixamorigLeftUpLeg', side: 'left' },
    { name: 'mixamorigLeftFoot', parent: 'mixamorigLeftLeg', side: 'left' },
    { name: 'mixamorigLeftToeBase', parent: 'mixamorigLeftFoot', side: 'left' },

    // Right Leg
    { name: 'mixamorigRightUpLeg', parent: 'mixamorigHips', side: 'right' },
    { name: 'mixamorigRightLeg', parent: 'mixamorigRightUpLeg', side: 'right' },
    { name: 'mixamorigRightFoot', parent: 'mixamorigRightLeg', side: 'right' },
    { name: 'mixamorigRightToeBase', parent: 'mixamorigRightFoot', side: 'right' },
  ];

  const bones = [];
  const boneMap = {};
  const boneWorldPos = {};

  for (const def of boneDefs) {
    const bone = new THREE.Bone();
    bone.name = def.name;
    boneMap[def.name] = bone;
    bones.push(bone);

    const pos = joints[def.name] || new THREE.Vector3();
    boneWorldPos[def.name] = pos.clone();
  }

  // Construct bone hierarchy with local relative offsets
  const rootBone = boneMap['mixamorigHips'];
  for (const def of boneDefs) {
    const bone = boneMap[def.name];
    if (def.parent) {
      const parent = boneMap[def.parent];
      parent.add(bone);
      const parentPos = boneWorldPos[def.parent];
      const myPos = boneWorldPos[def.name];
      bone.position.subVectors(myPos, parentPos);
    } else {
      bone.position.copy(boneWorldPos[def.name]);
    }
  }

  // Update world matrices for the skeleton
  rootBone.updateMatrixWorld(true);

  // Define bone segments for anatomical capsule skinning
  const headTop = new THREE.Vector3(boneWorldPos.mixamorigHead.x, targetHeight, boneWorldPos.mixamorigHead.z);
  const leftToeEnd = new THREE.Vector3(boneWorldPos.mixamorigLeftToeBase.x, 0.0, boneWorldPos.mixamorigLeftToeBase.z + 0.08);
  const rightToeEnd = new THREE.Vector3(boneWorldPos.mixamorigRightToeBase.x, 0.0, boneWorldPos.mixamorigRightToeBase.z + 0.08);
  const leftHandEnd = new THREE.Vector3(boneWorldPos.mixamorigLeftHand.x + 0.10, boneWorldPos.mixamorigLeftHand.y, boneWorldPos.mixamorigLeftHand.z);
  const rightHandEnd = new THREE.Vector3(boneWorldPos.mixamorigRightHand.x - 0.10, boneWorldPos.mixamorigRightHand.y, boneWorldPos.mixamorigRightHand.z);

  const segments = [
    { bone: 'mixamorigHips', a: boneWorldPos.mixamorigHips, b: boneWorldPos.mixamorigSpine, radius: 0.28, side: 'center' },
    { bone: 'mixamorigSpine', a: boneWorldPos.mixamorigSpine, b: boneWorldPos.mixamorigSpine1, radius: 0.22, side: 'center' },
    { bone: 'mixamorigSpine1', a: boneWorldPos.mixamorigSpine1, b: boneWorldPos.mixamorigSpine2, radius: 0.20, side: 'center' },
    { bone: 'mixamorigSpine2', a: boneWorldPos.mixamorigSpine2, b: boneWorldPos.mixamorigNeck, radius: 0.20, side: 'center' },
    { bone: 'mixamorigNeck', a: boneWorldPos.mixamorigNeck, b: boneWorldPos.mixamorigHead, radius: 0.16, side: 'center' },
    { bone: 'mixamorigHead', a: boneWorldPos.mixamorigHead, b: headTop, radius: 0.25, side: 'center' },

    // Left Arm
    { bone: 'mixamorigLeftShoulder', a: boneWorldPos.mixamorigLeftShoulder, b: boneWorldPos.mixamorigLeftArm, radius: 0.14, side: 'left' },
    { bone: 'mixamorigLeftArm', a: boneWorldPos.mixamorigLeftArm, b: boneWorldPos.mixamorigLeftForeArm, radius: 0.12, side: 'left' },
    { bone: 'mixamorigLeftForeArm', a: boneWorldPos.mixamorigLeftForeArm, b: boneWorldPos.mixamorigLeftHand, radius: 0.10, side: 'left' },
    { bone: 'mixamorigLeftHand', a: boneWorldPos.mixamorigLeftHand, b: leftHandEnd, radius: 0.09, side: 'left' },

    // Right Arm
    { bone: 'mixamorigRightShoulder', a: boneWorldPos.mixamorigRightShoulder, b: boneWorldPos.mixamorigRightArm, radius: 0.14, side: 'right' },
    { bone: 'mixamorigRightArm', a: boneWorldPos.mixamorigRightArm, b: boneWorldPos.mixamorigRightForeArm, radius: 0.12, side: 'right' },
    { bone: 'mixamorigRightForeArm', a: boneWorldPos.mixamorigRightForeArm, b: boneWorldPos.mixamorigRightHand, radius: 0.10, side: 'right' },
    { bone: 'mixamorigRightHand', a: boneWorldPos.mixamorigRightHand, b: rightHandEnd, radius: 0.09, side: 'right' },

    // Left Leg
    { bone: 'mixamorigLeftUpLeg', a: boneWorldPos.mixamorigLeftUpLeg, b: boneWorldPos.mixamorigLeftLeg, radius: 0.18, side: 'left' },
    { bone: 'mixamorigLeftLeg', a: boneWorldPos.mixamorigLeftLeg, b: boneWorldPos.mixamorigLeftFoot, radius: 0.14, side: 'left' },
    { bone: 'mixamorigLeftFoot', a: boneWorldPos.mixamorigLeftFoot, b: boneWorldPos.mixamorigLeftToeBase, radius: 0.12, side: 'left' },
    { bone: 'mixamorigLeftToeBase', a: boneWorldPos.mixamorigLeftToeBase, b: leftToeEnd, radius: 0.10, side: 'left' },

    // Right Leg
    { bone: 'mixamorigRightUpLeg', a: boneWorldPos.mixamorigRightUpLeg, b: boneWorldPos.mixamorigRightLeg, radius: 0.18, side: 'right' },
    { bone: 'mixamorigRightLeg', a: boneWorldPos.mixamorigRightLeg, b: boneWorldPos.mixamorigRightFoot, radius: 0.14, side: 'right' },
    { bone: 'mixamorigRightFoot', a: boneWorldPos.mixamorigRightFoot, b: boneWorldPos.mixamorigRightToeBase, radius: 0.12, side: 'right' },
    { bone: 'mixamorigRightToeBase', a: boneWorldPos.mixamorigRightToeBase, b: rightToeEnd, radius: 0.10, side: 'right' },
  ];

  const boneIndexLookup = {};
  bones.forEach((b, i) => boneIndexLookup[b.name] = i);

  console.log('2. Computing vertex skinning weights for', geom.attributes.position.count, 'vertices...');
  const posAttr = geom.attributes.position;
  const vertexCount = posAttr.count;
  const skinIndices = new Uint16Array(vertexCount * 4);
  const skinWeights = new Float32Array(vertexCount * 4);
  const p = new THREE.Vector3();

  for (let i = 0; i < vertexCount; i++) {
    p.fromBufferAttribute(posAttr, i);

    const isLeft = p.x > 0.02;
    const isRight = p.x < -0.02;

    const cand = [];
    for (const seg of segments) {
      if (isLeft && seg.side === 'right') continue;
      if (isRight && seg.side === 'left') continue;

      const d = distToSegment(p, seg.a, seg.b);
      const nd = d / seg.radius;
      const w = 1.0 / Math.pow(nd + 0.10, 4.0);
      cand.push({ bone: seg.bone, weight: w });
    }

    cand.sort((a, b) => b.weight - a.weight);

    let totalWeight = 0;
    const count = Math.min(4, cand.length);
    for (let k = 0; k < count; k++) {
      totalWeight += cand[k].weight;
    }

    for (let k = 0; k < 4; k++) {
      if (k < count && totalWeight > 0) {
        skinIndices[i * 4 + k] = boneIndexLookup[cand[k].bone] || 0;
        skinWeights[i * 4 + k] = cand[k].weight / totalWeight;
      } else {
        skinIndices[i * 4 + k] = 0;
        skinWeights[i * 4 + k] = (k === 0 ? 1.0 : 0.0);
      }
    }
  }

  geom.setAttribute('skinIndex', new THREE.Uint16BufferAttribute(skinIndices, 4));
  geom.setAttribute('skinWeight', new THREE.Float32BufferAttribute(skinWeights, 4));

  console.log('3. Assembling SkinnedMesh with vertex colors and Skeleton...');
  const mat = new THREE.MeshStandardMaterial({
    vertexColors: true,
    roughness: 0.55,
    metalness: 0.1
  });
  const skinnedMesh = new THREE.SkinnedMesh(geom, mat);
  skinnedMesh.name = 'HanumanMesh';

  const skeleton = new THREE.Skeleton(bones);
  skinnedMesh.add(rootBone);
  skinnedMesh.bind(skeleton);

  // Retarget animations
  console.log('4. Retargeting animations for in-place game controls...');
  const baseHipY = boneWorldPos.mixamorigHips.y;
  const mixamoHipY = 1.0427;
  const hipScaleY = baseHipY / mixamoHipY;

  function retargetClip(sourceClip, newName, isInPlace = true) {
    const tracks = [];

    for (const track of sourceClip.tracks) {
      const parts = track.name.split('.');
      const boneName = parts[0];
      const prop = parts[1];

      if (boneMap[boneName]) {
        if (prop === 'position' && boneName === 'mixamorigHips') {
          const values = new Float32Array(track.values.length);
          const initialZ = track.values[2];
          const initialX = track.values[0];

          for (let k = 0; k < track.values.length; k += 3) {
            values[k] = boneWorldPos.mixamorigHips.x + (track.values[k] - initialX) * hipScaleY;
            values[k + 1] = baseHipY + (track.values[k + 1] - mixamoHipY) * hipScaleY;
            if (isInPlace) {
              values[k + 2] = boneWorldPos.mixamorigHips.z;
            } else {
              values[k + 2] = boneWorldPos.mixamorigHips.z + (track.values[k + 2] - initialZ) * hipScaleY;
            }
          }
          tracks.push(new THREE.VectorKeyframeTrack(`${boneName}.position`, track.times, values));
        } else if (prop === 'quaternion') {
          tracks.push(track.clone());
        }
      }
    }

    return new THREE.AnimationClip(newName, sourceClip.duration, tracks);
  }

  const idleClip = retargetClip(idleGltf.animations[0], 'Idle', true);
  const walkClip = retargetClip(walkGltf.animations[0], 'Walk', true);
  const runClip = retargetClip(runGltf.animations[0], 'Run', true);
  const jumpClip = retargetClip(jumpGltf.animations[0], 'Jump', true);

  console.log(`  Idle clip: ${idleClip.tracks.length} tracks, duration ${idleClip.duration.toFixed(2)}s`);
  console.log(`  Walk clip: ${walkClip.tracks.length} tracks, duration ${walkClip.duration.toFixed(2)}s`);
  console.log(`  Run clip: ${runClip.tracks.length} tracks, duration ${runClip.duration.toFixed(2)}s`);
  console.log(`  Jump clip: ${jumpClip.tracks.length} tracks, duration ${jumpClip.duration.toFixed(2)}s`);

  // Build export scene
  const exportScene = new THREE.Scene();
  exportScene.name = 'HanumanRiggedScene';
  exportScene.add(skinnedMesh);

  console.log('5. Exporting to public/models/animated/hanuman_animated_colored.glb...');
  const exporter = new GLTFExporter();
  exporter.parse(
    exportScene,
    (gltf) => {
      fs.writeFileSync('public/models/animated/hanuman_animated_colored.glb', Buffer.from(gltf));
      const outSize = fs.statSync('public/models/animated/hanuman_animated_colored.glb').size;
      console.log(`SUCCESS! Exported hanuman_animated_colored.glb (${(outSize / 1024 / 1024).toFixed(2)} MB)`);
    },
    (err) => {
      console.error('Export error:', err);
    },
    {
      binary: true,
      animations: [idleClip, walkClip, runClip, jumpClip]
    }
  );
}

build().catch(console.error);
