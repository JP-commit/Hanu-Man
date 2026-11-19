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

async function exportColored() {
  console.log('1. Loading white mesh...');
  const gltf = await parseGLTF('public/models/hanuman_white_mesh_50k.glb');

  let origMesh = null;
  gltf.scene.traverse(c => {
    if (c.isMesh && !origMesh) origMesh = c;
  });
  if (!origMesh) throw new Error('No mesh found');

  const geom = origMesh.geometry.clone();
  geom.computeBoundingBox();
  const origBbox = geom.boundingBox.clone();
  const origSize = new THREE.Vector3().subVectors(origBbox.max, origBbox.min);
  const origCenter = new THREE.Vector3().addVectors(origBbox.min, origBbox.max).multiplyScalar(0.5);
  const origMinY = origBbox.min.y;

  const targetHeight = 1.45;
  const scale = targetHeight / origSize.y;

  // Normalize
  geom.translate(-origCenter.x, -origMinY, -origCenter.z);
  geom.scale(scale, scale, scale);
  geom.computeVertexNormals();

  // Load colors
  console.log('2. Applying vertex colors from public/models/vertex_colors.json...');
  const colorsNested = JSON.parse(fs.readFileSync('public/models/vertex_colors.json'));
  const colorsFlat = new Float32Array(colorsNested.length * 3);
  for (let i = 0; i < colorsNested.length; i++) {
    colorsFlat[i * 3] = colorsNested[i][0];
    colorsFlat[i * 3 + 1] = colorsNested[i][1];
    colorsFlat[i * 3 + 2] = colorsNested[i][2];
  }

  geom.setAttribute('color', new THREE.BufferAttribute(colorsFlat, 3));

  const mat = new THREE.MeshStandardMaterial({
    vertexColors: true,
    roughness: 0.55,
    metalness: 0.1
  });

  const coloredMesh = new THREE.Mesh(geom, mat);
  coloredMesh.name = 'HanumanColoredMesh';

  const scene = new THREE.Scene();
  scene.name = 'HanumanColoredScene';
  scene.add(coloredMesh);

  console.log('3. Exporting to public/models/hanuman_colored.glb...');
  const exporter = new GLTFExporter();
  exporter.parse(
    scene,
    (result) => {
      fs.writeFileSync('public/models/hanuman_colored.glb', Buffer.from(result));
      const size = fs.statSync('public/models/hanuman_colored.glb').size;
      console.log(`SUCCESS! Exported hanuman_colored.glb (${(size / 1024 / 1024).toFixed(2)} MB)`);
    },
    (err) => {
      console.error('Export error:', err);
    },
    { binary: true }
  );
}

exportColored().catch(console.error);
