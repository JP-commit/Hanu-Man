// src/characters/hanuman.js
// Child/adult Hanuman built from Three.js primitives, cel-shaded with an inverted-hull outline.
// Reference: boy Hanuman with topknot, tilak, orange sash, blue-grey waist cloth, cream shorts,
// gold armlets/anklets, bead necklace, barefoot, long curled tail.
//
// The model faces +Z, stands with its feet at y = 0 and is ~1.5 units tall (child, scale = 1).
// "side" +1 means the +X side of the body, -1 the -X side.
//
// Usage:
//   const hanuman = makeHanuman({ variant: 'child', scale: 1 });
//   scene.add(hanuman.root);
//   // animation lives in hanumanAnim.js

import * as THREE from 'three';
import { mergeVertices } from 'three/examples/jsm/utils/BufferGeometryUtils.js';

// ---------------------------------------------------------------- palette
export const COLORS = {
  skin: 0xf0b98c,
  skinDark: 0xd99a6c,
  blush: 0xef9a82,
  hair: 0x5a2e1e,
  tail: 0x8a4a2c,
  tailTip: 0x6e3a22,
  sash: 0xe8683a,
  cloth: 0x5e6878,
  cream: 0xf3e2c4,
  gold: 0xe3a93b,
  goldDark: 0xb27a1e,
  beads: 0x7a4425,
  outline: 0x2a1a12,
  white: 0xfff4e8,
  red: 0xd8402e,
  iris: 0x4a2a18,
  mouth: 0x7a3028,
};
const C = COLORS;

// Where the tail starts (radians). Segment 0 gets `base`, the rest get `curl` each.
export const TAIL_REST = { base: -1.45, curl: 0.28 };

// ---------------------------------------------------------------- toon + outline
let _gradient = null;
function gradientMap() {
  if (_gradient) return _gradient;
  // 3 flat bands: shadow, mid, light
  const data = new Uint8Array([
    95, 95, 95, 255,
    180, 180, 180, 255,
    255, 255, 255, 255,
  ]);
  _gradient = new THREE.DataTexture(data, 3, 1, THREE.RGBAFormat);
  _gradient.minFilter = THREE.NearestFilter;
  _gradient.magFilter = THREE.NearestFilter;
  _gradient.generateMipmaps = false;
  _gradient.needsUpdate = true;
  return _gradient;
}

const toonCache = new Map();
function toon(color) {
  let m = toonCache.get(color);
  if (!m) {
    m = new THREE.MeshToonMaterial({ color, gradientMap: gradientMap() });
    toonCache.set(color, m);
  }
  return m;
}

// Thin dark shell, pushed out along smooth normals, drawn on back faces only.
export const OUTLINE_THICKNESS = 0.011;
const OUTLINE_MATERIAL = new THREE.ShaderMaterial({
  uniforms: {
    uColor: { value: new THREE.Color(C.outline) },
    uThickness: { value: OUTLINE_THICKNESS },
  },
  vertexShader: /* glsl */ `
    uniform float uThickness;
    void main() {
      vec3 p = position + normalize(normal) * uThickness;
      gl_Position = projectionMatrix * modelViewMatrix * vec4(p, 1.0);
    }`,
  fragmentShader: /* glsl */ `
    uniform vec3 uColor;
    void main() { gl_FragColor = vec4(uColor, 1.0); }`,
  side: THREE.BackSide,
});

// Hard-edged primitives (cylinders, capsule seams) get split normals, which would open gaps in the
// outline. Weld the vertices and recompute smooth normals for the outline copy only.
const outlineGeoCache = new WeakMap();
function outlineGeometry(geo) {
  let g = outlineGeoCache.get(geo);
  if (!g) {
    g = geo.clone();
    g.deleteAttribute('normal');
    g.deleteAttribute('uv');
    g = mergeVertices(g, 1e-4);
    g.computeVertexNormals();
    outlineGeoCache.set(geo, g);
  }
  return g;
}

// ---------------------------------------------------------------- tiny builders
function make(geo, color, { outline = true, pos, rot, scale, parent } = {}) {
  const mesh = new THREE.Mesh(geo, toon(color));
  mesh.castShadow = true;
  if (outline) mesh.add(new THREE.Mesh(outlineGeometry(geo), OUTLINE_MATERIAL));
  if (pos) mesh.position.set(pos[0], pos[1], pos[2]);
  if (rot) mesh.rotation.set(rot[0], rot[1], rot[2]);
  if (scale) mesh.scale.set(scale[0], scale[1], scale[2]);
  if (parent) parent.add(mesh);
  return mesh;
}
const sphere = (r, color, o) => make(new THREE.SphereGeometry(r, 20, 14), color, o);
const capsule = (r, len, color, o) => make(new THREE.CapsuleGeometry(r, len, 6, 14), color, o);
const torus = (R, tube, color, o) => make(new THREE.TorusGeometry(R, tube, 8, 24), color, o);
const cylinder = (rt, rb, h, color, o) => make(new THREE.CylinderGeometry(rt, rb, h, 20), color, o);
const cone = (r, h, color, o) => make(new THREE.ConeGeometry(r, h, 8), color, o);

function grp(parent, x = 0, y = 0, z = 0) {
  const g = new THREE.Group();
  g.position.set(x, y, z);
  if (parent) parent.add(g);
  return g;
}

const Y_AXIS = new THREE.Vector3(0, 1, 0);
function orient(mesh, dir) {
  mesh.quaternion.setFromUnitVectors(Y_AXIS, dir.clone().normalize());
}

// ---------------------------------------------------------------- the character
export function makeHanuman({ variant = 'child', scale = 1 } = {}) {
  const adult = variant === 'adult';

  const root = grp(null);
  root.name = 'Hanuman';
  const body = grp(root);                 // variant scaling lives here, squash/stretch lives on root
  if (adult) body.scale.setScalar(1.35);

  const hips = grp(body, 0, 0.5, 0);

  // ---- legs: baggy cream shorts, bare shins, gold anklets, bare feet
  const legs = [1, -1].map((side) => {
    const hip = grp(hips, side * 0.085, 0, 0);
    capsule(0.085, 0.04, C.cream, { parent: hip, pos: [0, -0.1, 0] });
    torus(0.083, 0.011, C.gold, { parent: hip, pos: [0, -0.195, 0], rot: [Math.PI / 2, 0, 0], outline: false });

    const knee = grp(hip, 0, -0.2, 0);
    capsule(0.048, 0.1, C.skin, { parent: knee, pos: [0, -0.1, 0] });

    const ankle = grp(knee, 0, -0.2, 0);
    torus(0.05, 0.012, C.gold, { parent: ankle, pos: [0, -0.02, 0], rot: [Math.PI / 2, 0, 0], outline: false });
    sphere(0.06, C.skin, { parent: ankle, pos: [0, -0.06, 0.035], scale: [0.9, 0.55, 1.5] });

    return { hip, knee, ankle, side };
  });

  // ---- torso
  const spine = grp(hips, 0, 0.04, 0);
  if (adult) spine.scale.set(1.15, 1, 1.05);

  capsule(0.115, 0.14, C.skin, { parent: spine, pos: [0, 0.15, 0], scale: [1, 1, 0.78] });

  // blue-grey waist cloth, brown belt, gold medallion, front flap
  cylinder(0.15, 0.175, 0.13, C.cloth, { parent: spine, pos: [0, 0.02, 0] });
  torus(0.157, 0.013, C.beads, { parent: spine, pos: [0, 0.075, 0], rot: [Math.PI / 2, 0, 0] });
  capsule(0.05, 0.09, C.cloth, { parent: spine, pos: [0.025, -0.06, 0.165], scale: [1.3, 1, 0.25] });
  cylinder(0.04, 0.04, 0.016, C.gold, { parent: spine, pos: [0, 0.075, 0.176], rot: [Math.PI / 2, 0, 0] });
  cylinder(0.022, 0.022, 0.02, C.goldDark, { parent: spine, pos: [0, 0.075, 0.18], rot: [Math.PI / 2, 0, 0], outline: false });

  // orange sash: over the +X shoulder, diagonally down to the -X hip (front and back panels)
  [0.095, -0.095].forEach((z) => {
    capsule(0.034, 0.3, C.sash, { parent: spine, pos: [0, 0.185, z], rot: [0, 0, -0.57], scale: [1, 1, 0.4] });
  });
  sphere(0.062, C.sash, { parent: spine, pos: [0.12, 0.31, 0], scale: [1, 0.8, 1.1] });

  // bead necklace + neck
  torus(0.115, 0.011, C.beads, { parent: spine, pos: [0, 0.31, 0.02], rot: [Math.PI / 2 + 0.4, 0, 0] });
  cylinder(0.05, 0.055, 0.08, C.skin, { parent: spine, pos: [0, 0.345, 0] });

  // ---- head
  const head = grp(spine, 0, 0.36, 0);
  const R = 0.25, CY = 0.2, SY = 0.97, SZ = 0.96;
  sphere(R, C.skin, { parent: head, pos: [0, CY, 0], scale: [1, SY, SZ] });

  // z of the head surface at (x, y), so face details sit on the skin
  const faceZ = (x, y) => {
    const dy = (y - CY) / SY;
    return Math.sqrt(Math.max(0, R * R - x * x - dy * dy)) * SZ;
  };

  // ears
  [1, -1].forEach((s) => {
    sphere(0.06, C.skin, { parent: head, pos: [s * 0.245, 0.17, -0.01], scale: [0.5, 1, 0.8] });
    sphere(0.035, C.skinDark, { parent: head, pos: [s * 0.255, 0.17, 0.0], scale: [0.35, 1, 0.7], outline: false });
  });

  // eyes (big, anime-style), each in its own group so they can blink
  const eyes = [1, -1].map((s) => {
    const x = s * 0.085, y = 0.19;
    const eye = grp(head, x, y, faceZ(x, y) + 0.004);
    sphere(0.058, C.white, { parent: eye, scale: [0.85, 1.05, 0.4] });
    sphere(0.042, C.iris, { parent: eye, pos: [0, -0.002, 0.014], scale: [0.95, 1.1, 0.45], outline: false });
    sphere(0.011, C.white, { parent: eye, pos: [0.014, 0.016, 0.036], scale: [1, 1, 0.6], outline: false });
    return eye;
  });

  // brows, nose, mouth, cheeks
  [1, -1].forEach((s) => {
    const x = s * 0.085;
    capsule(0.009, 0.04, C.hair, {
      parent: head, pos: [x, 0.265, faceZ(x, 0.265) + 0.004], rot: [0, 0, Math.PI / 2 - s * 0.12], outline: false,
    });
    sphere(0.034, C.blush, {
      parent: head, pos: [s * 0.14, 0.13, faceZ(s * 0.14, 0.13) + 0.002], scale: [1, 0.7, 0.25], outline: false,
    });
  });
  sphere(0.014, C.skinDark, { parent: head, pos: [0, 0.165, faceZ(0, 0.165) + 0.006], outline: false });
  make(new THREE.TorusGeometry(0.035, 0.007, 6, 16, Math.PI), C.mouth, {
    parent: head, pos: [0, 0.118, faceZ(0, 0.118) + 0.003], rot: [0, 0, Math.PI], outline: false,
  });

  // tilak: two white lines with a red centre, tilted to lie on the forehead
  const tz = faceZ(0, 0.335) + 0.004;
  [0.017, -0.017].forEach((x) => {
    capsule(0.008, 0.05, C.white, { parent: head, pos: [x, 0.335, tz], rot: [-0.65, 0, 0], scale: [1, 1, 0.5], outline: false });
  });
  capsule(0.006, 0.04, C.red, { parent: head, pos: [0, 0.335, tz + 0.003], rot: [-0.65, 0, 0], scale: [1, 1, 0.5], outline: false });

  // hair: tilted cap (high hairline at the front, low at the back), back mass, bangs, spikes, topknot
  make(new THREE.SphereGeometry(0.262, 28, 18, 0, Math.PI * 2, 0, 1.24), C.hair, {
    parent: head, pos: [0, CY, -0.005], rot: [-0.5, 0, 0], scale: [1, SY, SZ],
  });
  sphere(0.235, C.hair, { parent: head, pos: [0, 0.2, -0.055] });

  const HR = 0.255;
  const hairPoint = (theta, phi) => new THREE.Vector3(
    HR * Math.sin(theta) * Math.sin(phi),
    CY + HR * Math.cos(theta) * SY,
    HR * Math.sin(theta) * Math.cos(phi) * SZ,
  );
  // bangs and temple locks
  for (let i = -3; i <= 3; i++) {
    const phi = i * 0.32;
    const p = hairPoint(0.75 + 0.35 * Math.abs(phi), phi);
    const lock = cone(0.045, 0.11, C.hair, { parent: head, pos: [p.x, p.y - 0.03, p.z] });
    orient(lock, new THREE.Vector3(Math.sin(phi) * 0.4, -1, 0.35));
  }
  // messy spikes around the back and top
  for (let i = 0; i < 9; i++) {
    const phi = Math.PI * 0.55 + (i / 8) * Math.PI * 0.9 + (i % 2 ? 0.1 : -0.1);
    const theta = 1.25 + (i % 3) * 0.1;
    const p = hairPoint(theta, phi);
    const spike = cone(0.06, 0.14, C.hair, { parent: head, pos: [p.x * 1.05, p.y, p.z * 1.05] });
    orient(spike, new THREE.Vector3(p.x, p.y - CY - 0.05, p.z));
  }
  sphere(0.085, C.hair, { parent: head, pos: [0, 0.52, -0.03] });
  torus(0.06, 0.013, C.gold, { parent: head, pos: [0, 0.462, -0.03], rot: [Math.PI / 2, 0, 0], outline: false });
  cone(0.03, 0.07, C.hair, { parent: head, pos: [0, 0.6, -0.03] });
  if (adult) head.scale.setScalar(0.85);

  // ---- arms: skin, gold armlet + bracelet, small round hand
  const arms = [1, -1].map((side) => {
    const shoulder = grp(spine, side * 0.165, 0.28, 0);
    shoulder.rotation.z = side * 0.1;
    sphere(0.05, C.skin, { parent: shoulder });
    capsule(0.045, 0.09, C.skin, { parent: shoulder, pos: [0, -0.085, 0] });
    torus(0.05, 0.012, C.gold, { parent: shoulder, pos: [0, -0.07, 0], rot: [Math.PI / 2, 0, 0], outline: false });

    const elbow = grp(shoulder, 0, -0.17, 0);
    capsule(0.04, 0.09, C.skin, { parent: elbow, pos: [0, -0.075, 0] });
    torus(0.044, 0.011, C.gold, { parent: elbow, pos: [0, -0.13, 0], rot: [Math.PI / 2, 0, 0], outline: false });

    const hand = grp(elbow, 0, -0.155, 0);
    sphere(0.05, C.skin, { parent: hand, pos: [0, -0.03, 0], scale: [1, 1.1, 0.85] });
    return { shoulder, elbow, hand, side };
  });

  // ---- tail: chain of 10 segments, curls up at the end with a darker tuft
  const tail = [];
  let tailParent = grp(hips, 0, 0.06, -0.1);
  for (let i = 0; i < 10; i++) {
    const seg = grp(tailParent, 0, i === 0 ? 0 : 0.1, 0);
    capsule(0.034 - i * 0.0012, 0.07, C.tail, { parent: seg, pos: [0, 0.05, 0] });
    if (i === 9) sphere(0.05, C.tailTip, { parent: seg, pos: [0, 0.12, 0], scale: [0.9, 1.5, 0.9] });
    seg.rotation.x = i === 0 ? TAIL_REST.base : TAIL_REST.curl;
    tail.push(seg);
    tailParent = seg;
  }

  // ---- gada (mace): hidden for the child, shown for the adult
  const gada = grp(arms[1].hand, 0, -0.05, 0.04);
  cylinder(0.018, 0.018, 0.4, C.goldDark, { parent: gada, pos: [0, 0.12, 0] });
  sphere(0.09, C.gold, { parent: gada, pos: [0, 0.38, 0], scale: [1, 1.25, 1] });
  gada.rotation.x = 0.6;
  gada.visible = adult;

  root.scale.setScalar(scale);

  return {
    root,
    variant,
    baseScale: scale,
    joints: { body, hips, spine, head, legs, arms, tail, eyes, gada },
  };
}
