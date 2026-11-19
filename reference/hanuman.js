// reference/hanuman.js
// Child/adult Hanuman built from Three.js primitives, faithfully matching the boy-Hanuman reference sheet:
// - Young, childlike vanara face with large expressive eyes, dark pupils, and bright dual highlights
// - Soft, natural peachy-cream vanara muzzle with vanara button nose and cheerful smile
// - Sacred white & red Vaishnava U-tilak on forehead
// - Rich chocolate-brown hair with high sculpted topknot (shikha) bound by a gold band, and framed fringe locks
// - Bare golden-tan chest with sacred rudraksha bead necklace
// - Saffron-orange fabric sash (uttariya) draped over the left shoulder across the chest with hip knot
// - Puffy cream dhoti shorts (kachha) with golden embroidered hem borders
// - Slate-blue waist wrap with large circular golden medallion buckle and hanging pleated loincloth flap
// - Traditional golden ornaments: bicep armlets (keyura), wrist bracelets (kankana), and anklets (nupura)
// - Bare feet with defined toes and agile athletic limbs
// - Long, majestic vanara tail arching proudly behind with a dark chocolate fluffy tuft
//
// Shading is handled by a self-contained toon shader with discrete cel bands and inverted-hull outlines.
//
// The model faces +Z, stands with its feet at y = 0 and is ~1.6 units tall (child, scale = 1).
// "side" +1 means the +X side of the body (character's left), -1 the -X side (character's right).

import * as THREE from 'three';
import { mergeVertices } from 'three/examples/jsm/utils/BufferGeometryUtils.js';

// ---------------------------------------------------------------- palette (sRGB, shown as-is)
export const COLORS = {
  skin: 0xedb088,        // warm golden-peach vanara body skin
  skinMuzzle: 0xfbd8bd,  // soft creamy-peach for vanara muzzle/snout
  skinDark: 0xd4936a,    // inner ear contour & nostril shadow
  blush: 0xee927b,       // soft rosy cheek blush
  hair: 0x4e2517,        // deep rich chocolate brown for hair, eyebrows & topknot
  sash: 0xe6592a,        // vibrant saffron-vermilion orange
  cloth: 0x4e5e73,       // slate-blue / charcoal waist cloth
  clothDark: 0x3d4b5d,   // deeper slate-blue for belt wrap
  cream: 0xf4e5c8,       // warm ivory/cream for puffy dhoti shorts
  gold: 0xe5ac38,        // radiant temple gold for jewellery and trims
  goldDark: 0xb37e22,    // engraved inner gold detail
  beads: 0x6e371b,       // sacred rudraksha beads
  outline: 0x362117,     // warm dark brown comic inking outline
  white: 0xfff7ee,       // eye sclera & tilak white
  red: 0xd62828,         // sacred vermilion red tilak center
  iris: 0x5a301a,        // warm honey-chestnut iris
  pupil: 0x180c07,       // deep dark pupil
  mouth: 0x8a3832,       // cute cheerful smile
  tailBase: 0xa8653c,    // golden brown base of tail
  tailMid: 0x7e4024,     // mid tail
  tailTip: 0x4e2517,     // fluffy chocolate brown tail tuft
};
const C = COLORS;

// Rest pose constants shared with hanumanAnim.js
export const HIPS_Y = 0.6;
export const SPINE_Y = 0.04;
export const TAIL_REST = { base: -2.0, curl: 0.28 };
const TAIL_SEGMENTS = 10;
const TAIL_STEP = 0.088;

// ---------------------------------------------------------------- toon shader (light independent)
export const LIGHT_DIR = new THREE.Vector3(0.45, 0.8, 0.55).normalize();
const lightUniform = { value: LIGHT_DIR };

function rawColor(hex) {
  const c = new THREE.Color();
  c.setHex(hex, THREE.LinearSRGBColorSpace);
  return c;
}

const toonCache = new Map();
function toon(hex) {
  let m = toonCache.get(hex);
  if (!m) {
    m = new THREE.ShaderMaterial({
      uniforms: { uColor: { value: rawColor(hex) }, uLightDir: lightUniform },
      vertexShader: /* glsl */ `
        varying vec3 vN;
        void main() {
          mat3 nm = transpose(inverse(mat3(modelMatrix)));
          vN = normalize(nm * normal);
          gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
        }`,
      fragmentShader: /* glsl */ `
        uniform vec3 uColor;
        uniform vec3 uLightDir;
        varying vec3 vN;
        void main() {
          float d = dot(normalize(vN), normalize(uLightDir));
          vec3 c = uColor;
          if (d < -0.1)      c *= vec3(0.74, 0.66, 0.76);   // soft cool shadow band
          else if (d < 0.35) c *= vec3(0.88, 0.82, 0.90);   // mid band
          gl_FragColor = vec4(c, 1.0);
        }`,
    });
    toonCache.set(hex, m);
  }
  return m;
}

// Thin dark shell, pushed out along smooth normals, drawn on back faces only.
export const OUTLINE_THICKNESS = 0.009;
const OUTLINE_MATERIAL = new THREE.ShaderMaterial({
  uniforms: { uColor: { value: rawColor(C.outline) }, uThickness: { value: OUTLINE_THICKNESS } },
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

const sphere = (r, color, o) => make(new THREE.SphereGeometry(r, 22, 16), color, o);
const capsule = (r, len, color, o) => make(new THREE.CapsuleGeometry(r, len, 6, 14), color, o);
const torus = (R, tube, color, o) => make(new THREE.TorusGeometry(R, tube, 8, 28), color, o);
const cylinder = (rt, rb, h, color, o) => make(new THREE.CylinderGeometry(rt, rb, h, 22), color, o);

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
  const body = grp(root);
  if (adult) body.scale.setScalar(1.35);

  const hips = grp(body, 0, HIPS_Y, 0);

  // ---- legs: puffy cream dhoti shorts with gold embroidered hem, gold anklets, bare feet
  const legs = [1, -1].map((side) => {
    const hip = grp(hips, side * 0.082, 0, 0);

    // 1. Puffy gathered cream dhoti shorts (kachha)
    sphere(0.122, C.cream, { parent: hip, pos: [0, -0.09, 0], scale: [1.18, 1.25, 1.14] });
    capsule(0.084, 0.11, C.cream, { parent: hip, pos: [0, -0.125, 0], scale: [1.10, 1.0, 1.06] });
    // Golden embroidered trim around lower thigh / knee cuff
    torus(0.088, 0.012, C.gold, { parent: hip, pos: [0, -0.218, 0], rot: [Math.PI / 2, 0, 0], outline: false });

    // 2. Knee & athletic boy calf
    const knee = grp(hip, 0, -0.24, 0);
    capsule(0.044, 0.14, C.skin, { parent: knee, pos: [0, -0.115, 0] });

    // 3. Ankle & barefoot
    const ankle = grp(knee, 0, -0.24, 0);
    // Gold anklet (nupura)
    torus(0.046, 0.011, C.gold, { parent: ankle, pos: [0, -0.02, 0], rot: [Math.PI / 2, 0, 0], outline: false });
    // Bare foot heel & arch
    sphere(0.052, C.skin, { parent: ankle, pos: [0, -0.082, 0.028], scale: [0.86, 0.58, 1.48] });

    // 5 cute stylized toes across the front
    const toeX = [-0.028, -0.014, 0.0, 0.014, 0.028];
    const toeR = [0.015, 0.014, 0.013, 0.012, 0.011];
    toeX.forEach((tx, idx) => {
      sphere(toeR[idx], C.skin, {
        parent: ankle,
        pos: [tx, -0.095, 0.095],
        scale: [1, 0.75, 1.2],
        outline: false,
      });
    });

    return { hip, knee, ankle, side };
  });

  // Central crotch volume of dhoti shorts
  sphere(0.138, C.cream, { parent: hips, pos: [0, -0.04, 0], scale: [1.06, 0.85, 0.95] });

  // ---- torso: compact athletic tan chest
  const spine = grp(hips, 0, SPINE_Y, 0);
  if (adult) spine.scale.set(1.22, 1, 1.15);

  capsule(0.106, 0.13, C.skin, { parent: spine, pos: [0, 0.135, 0], scale: [1.02, 1, 0.84] });

  // slate-blue waist cloth (kamarbandh)
  cylinder(0.144, 0.168, 0.14, C.cloth, { parent: spine, pos: [0, 0.01, 0], scale: [1.02, 1.0, 0.88] });
  torus(0.166, 0.008, C.gold, { parent: spine, pos: [0, -0.062, 0], rot: [Math.PI / 2, 0, 0], outline: false });

  // waist sash belt
  cylinder(0.146, 0.150, 0.042, C.clothDark, { parent: spine, pos: [0, 0.065, 0], scale: [1.01, 1.0, 0.88] });

  // Large circular golden medallion buckle at the center front
  cylinder(0.048, 0.048, 0.016, C.gold, { parent: spine, pos: [0, 0.055, 0.152], rot: [Math.PI / 2, 0, 0] });
  cylinder(0.034, 0.034, 0.020, C.goldDark, { parent: spine, pos: [0, 0.055, 0.156], rot: [Math.PI / 2, 0, 0], outline: false });
  sphere(0.018, C.gold, { parent: spine, pos: [0, 0.055, 0.165], outline: false });

  // Hanging pleated front loincloth flap with golden trim
  capsule(0.046, 0.12, C.cloth, { parent: spine, pos: [0, -0.082, 0.150], scale: [1.45, 1.15, 0.22] });
  capsule(0.007, 0.082, C.gold, { parent: spine, pos: [0, -0.150, 0.156], rot: [0, 0, Math.PI / 2], outline: false });

  // Saffron sash (uttariya): draped over character's left shoulder (+X), running across chest to right hip (-X)
  capsule(0.044, 0.28, C.sash, { parent: spine, pos: [0.01, 0.16, 0.082], rot: [0.08, 0.05, -0.58], scale: [1.30, 1.0, 0.36] });
  capsule(0.042, 0.28, C.sash, { parent: spine, pos: [0.01, 0.16, -0.082], rot: [-0.08, -0.05, -0.58], scale: [1.30, 1.0, 0.36] });
  sphere(0.065, C.sash, { parent: spine, pos: [0.118, 0.265, 0], scale: [1.0, 0.85, 1.25] });
  // Right hip sash knot / folded tail
  sphere(0.044, C.sash, { parent: spine, pos: [-0.135, 0.02, 0.04], scale: [0.9, 1.2, 0.8] });
  capsule(0.026, 0.08, C.sash, { parent: spine, pos: [-0.145, -0.04, 0.03], rot: [0, 0, 0.2], scale: [1.0, 1.0, 0.4] });

  // Sacred rudraksha bead necklace around the neck & upper chest
  torus(0.106, 0.013, C.beads, { parent: spine, pos: [0, 0.252, 0.025], rot: [Math.PI / 2 + 0.36, 0, 0] });
  sphere(0.018, C.gold, { parent: spine, pos: [0, 0.222, 0.095], outline: false }); // central guru bead / pendant

  // Neck
  cylinder(0.046, 0.054, 0.085, C.skin, { parent: spine, pos: [0, 0.29, 0] });

  // ---- head: cute vanara boy proportions
  const head = grp(spine, 0, 0.31, 0);
  const R = 0.25, CY = 0.2, SY = 0.98, SZ = 0.97;
  sphere(R, C.skin, { parent: head, pos: [0, CY, 0], scale: [1.02, SY, SZ] });

  const faceZ = (x, y) => {
    const dy = (y - CY) / SY;
    return Math.sqrt(Math.max(0, R * R - x * x - dy * dy)) * SZ;
  };

  // ---- Vanara Muzzle (Snout): soft, shallow peachy-cream mound contouring the lower face
  const muzzleY = 0.125;
  const mZ = faceZ(0, muzzleY);
  sphere(0.122, C.skinMuzzle, {
    parent: head,
    pos: [0, muzzleY, mZ - 0.035],
    scale: [1.18, 0.76, 0.42],
    outline: false,
  });

  // Vanara Nose: small cute dark-tan button on the upper muzzle
  sphere(0.014, C.skinDark, {
    parent: head,
    pos: [0, 0.156, faceZ(0, 0.156) + 0.014],
    scale: [1.2, 0.85, 0.6],
    outline: false,
  });

  // Upbeat cheerful smile on the muzzle
  make(new THREE.TorusGeometry(0.034, 0.006, 6, 20, Math.PI), C.mouth, {
    parent: head,
    pos: [0, 0.110, faceZ(0, 0.110) + 0.016],
    rot: [0, 0, Math.PI],
    scale: [1.05, 0.70, 0.5],
    outline: false,
  });

  // Cheeks: rosy blush on outer cheeks flanking the muzzle
  [1, -1].forEach((s) => {
    sphere(0.036, C.blush, {
      parent: head,
      pos: [s * 0.148, 0.130, faceZ(s * 0.148, 0.130) + 0.005],
      scale: [1, 0.72, 0.25],
      outline: false,
    });
  });

  // ---- Vanara Ears: expressive, slightly flared at the upper tip
  [1, -1].forEach((s) => {
    sphere(0.060, C.skin, { parent: head, pos: [s * 0.255, 0.175, -0.01], rot: [0.1, s * 0.25, s * -0.15], scale: [0.46, 1.15, 0.85] });
    sphere(0.034, C.skinDark, { parent: head, pos: [s * 0.262, 0.175, 0.005], rot: [0.1, s * 0.25, s * -0.15], scale: [0.3, 0.95, 0.7], outline: false });
  });

  // ---- Eyes: large, expressive anime eyes with dark upper lash line & dual highlights
  const eyes = [1, -1].map((s) => {
    const x = s * 0.090, y = 0.188;
    const eye = grp(head, x, y, faceZ(x, y) + 0.005);

    // Sclera (white)
    sphere(0.052, C.white, { parent: eye, scale: [0.84, 1.04, 0.42] });
    // Upper eyelid / lash line
    capsule(0.007, 0.048, C.hair, {
      parent: eye,
      pos: [0, 0.038, 0.018],
      rot: [0, 0, Math.PI / 2 + s * 0.12],
      scale: [1, 1, 0.4],
      outline: false,
    });
    // Iris (warm chestnut brown)
    sphere(0.042, C.iris, { parent: eye, pos: [0, -0.002, 0.013], scale: [0.96, 1.08, 0.45], outline: false });
    // Pupil (deep dark black)
    sphere(0.022, C.pupil, { parent: eye, pos: [0, -0.002, 0.026], scale: [1, 1.05, 0.4], outline: false });
    // Primary large specular shine
    sphere(0.013, C.white, { parent: eye, pos: [s * 0.012, 0.016, 0.034], scale: [1, 1, 0.5], outline: false });
    // Secondary twinkle
    sphere(0.007, C.white, { parent: eye, pos: [-s * 0.010, -0.014, 0.031], scale: [1, 1, 0.5], outline: false });

    return eye;
  });

  // Eyebrows: arched, confident dark chocolate brows
  [1, -1].forEach((s) => {
    capsule(0.009, 0.046, C.hair, {
      parent: head,
      pos: [s * 0.092, 0.262, faceZ(s * 0.092, 0.262) + 0.006],
      rot: [0.08, s * 0.12, Math.PI / 2 - s * 0.14],
      scale: [1, 1, 0.45],
      outline: false,
    });
  });

  // ---- Vaishnava U-Tilak: crisp white "U" mark with sacred red vertical stripe in center
  const ty = 0.318;
  const tz = faceZ(0, ty) + 0.005;
  // Left and right vertical arms of the "U"
  [0.016, -0.016].forEach((x) => {
    capsule(0.0075, 0.052, C.white, {
      parent: head, pos: [x, ty + 0.004, tz], rot: [-0.55, 0, 0], scale: [1, 1, 0.4], outline: false,
    });
  });
  // Bottom connected loop of the "U"
  sphere(0.0075, C.white, {
    parent: head, pos: [0, ty - 0.024, tz], scale: [2.3, 0.9, 0.4], outline: false,
  });
  // Center vermilion red vertical stripe
  capsule(0.0065, 0.054, C.red, {
    parent: head, pos: [0, ty + 0.004, tz + 0.003], rot: [-0.55, 0, 0], scale: [1, 1, 0.4], outline: false,
  });

  // ---- Hair & Topknot (Shikha)
  // Main back hair dome
  sphere(0.285, C.hair, { parent: head, pos: [0, 0.225, -0.065], scale: [0.96, 1.02, 1.0] });

  // Topknot (shikha) sitting atop the crown, angled naturally back
  const topknotAngle = -0.15;
  torus(0.062, 0.013, C.gold, { parent: head, pos: [0, 0.485, -0.05], rot: [Math.PI / 2 - topknotAngle, 0, 0], outline: false });
  // Onion/teardrop shaped bun
  sphere(0.088, C.hair, { parent: head, pos: [0, 0.548, -0.06], rot: [topknotAngle, 0, 0], scale: [0.95, 1.15, 0.95] });
  sphere(0.046, C.hair, { parent: head, pos: [0, 0.632, -0.075], rot: [topknotAngle, 0, 0], scale: [0.82, 1.35, 0.82] });

  const hairPoint = (theta, phi, r) => new THREE.Vector3(
    r * Math.sin(theta) * Math.sin(phi),
    CY + r * Math.cos(theta) * SY,
    r * Math.sin(theta) * Math.cos(phi) * SZ,
  );

  // Fringe bangs: curved locks cleanly sweeping down both sides of the tilak
  [-1.38, -1.02, -0.70, -0.36, 0.36, 0.70, 1.02, 1.38].forEach((phi) => {
    const p = hairPoint(0.72 + 0.28 * Math.abs(phi), phi, 0.262);
    const lock = sphere(0.044, C.hair, { parent: head, pos: [p.x, p.y - 0.018, p.z], scale: [0.85, 1.65, 0.7] });
    orient(lock, new THREE.Vector3(Math.sin(phi) * 0.5, -1, 0.35));
  });

  // Temple & sideburn puffs in front of ears
  [1, -1].forEach((s) => {
    sphere(0.058, C.hair, { parent: head, pos: [s * 0.220, 0.285, 0.04], scale: [0.72, 1.25, 0.9] });
  });

  // Layered sculpted hair clumps around back and sides
  for (let i = 0; i < 11; i++) {
    const phi = Math.PI * 0.45 + i * (Math.PI / 9);
    const theta = 1.12 + (i % 3) * 0.24;
    const px = 0.265 * Math.sin(theta) * Math.sin(phi);
    const py = CY + 0.265 * Math.cos(theta) * SY;
    const pz = 0.265 * Math.sin(theta) * Math.cos(phi) * SZ;
    const clump = sphere(0.076, C.hair, { parent: head, pos: [px * 1.02, py, pz * 1.02 - 0.025], scale: [1, 1.28, 1] });
    orient(clump, new THREE.Vector3(px, py - CY - 0.25, pz));
  }

  if (adult) head.scale.setScalar(0.85);

  // ---- arms: athletic boy arms, gold armlets (keyura) & wrist bracelets (kankana)
  const arms = [1, -1].map((side) => {
    const shoulder = grp(spine, side * 0.148, 0.25, 0);
    shoulder.rotation.z = side * 0.1;
    sphere(0.044, C.skin, { parent: shoulder });
    capsule(0.038, 0.12, C.skin, { parent: shoulder, pos: [0, -0.09, 0] });
    // Golden armlet (keyura) on bicep
    torus(0.042, 0.011, C.gold, { parent: shoulder, pos: [0, -0.07, 0], rot: [Math.PI / 2, 0, 0], outline: false });

    const elbow = grp(shoulder, 0, -0.18, 0);
    capsule(0.034, 0.11, C.skin, { parent: elbow, pos: [0, -0.085, 0] });
    // Golden wristband (kankana)
    torus(0.038, 0.010, C.gold, { parent: elbow, pos: [0, -0.14, 0], rot: [Math.PI / 2, 0, 0], outline: false });

    // Hand: palm + thumb + fingers cluster
    const hand = grp(elbow, 0, -0.17, 0);
    sphere(0.038, C.skin, { parent: hand, pos: [0, -0.03, 0], scale: [0.95, 1.15, 0.82] });
    // Stylized thumb & fingers
    sphere(0.016, C.skin, { parent: hand, pos: [side * 0.025, -0.025, 0.015], scale: [0.8, 1.2, 0.8], outline: false });
    sphere(0.022, C.skin, { parent: hand, pos: [0, -0.055, 0.005], scale: [1.1, 0.8, 0.8], outline: false });

    return { shoulder, elbow, hand, side };
  });

  // ---- tail: majestic, long vanara tail arching proudly behind with dark fluffy tuft
  const tail = [];
  let tailParent = grp(hips, 0, 0.045, -0.11);
  for (let i = 0; i < TAIL_SEGMENTS; i++) {
    const seg = grp(tailParent, 0, i === 0 ? 0 : TAIL_STEP, 0);
    const col = i < 3 ? C.tailBase : i < TAIL_SEGMENTS - 2 ? C.tailMid : C.tailTip;
    const r = Math.max(0.022, 0.038 - i * 0.0015);
    capsule(r, 0.055, col, { parent: seg, pos: [0, TAIL_STEP / 2, 0] });

    // Layered fluffy chocolate brown tuft at the tip
    if (i === TAIL_SEGMENTS - 1) {
      sphere(0.062, C.tailTip, { parent: seg, pos: [0, TAIL_STEP + 0.025, 0], scale: [0.92, 1.85, 0.92] });
      sphere(0.045, C.tailTip, { parent: seg, pos: [0, TAIL_STEP + 0.075, 0.015], scale: [0.82, 1.35, 0.82], outline: false });
    }

    seg.rotation.x = i === 0 ? TAIL_REST.base : TAIL_REST.curl;
    tail.push(seg);
    tailParent = seg;
  }

  // ---- gada (mace): hidden for child, shown for adult
  const gada = grp(arms[1].hand, 0, -0.05, 0.04);
  cylinder(0.018, 0.018, 0.42, C.goldDark, { parent: gada, pos: [0, 0.12, 0] });
  sphere(0.095, C.gold, { parent: gada, pos: [0, 0.38, 0], scale: [1, 1.25, 1] });
  torus(0.098, 0.014, C.goldDark, { parent: gada, pos: [0, 0.38, 0], rot: [Math.PI / 2, 0, 0], outline: false });
  cylinder(0.008, 0.024, 0.06, C.gold, { parent: gada, pos: [0, 0.52, 0] });
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
