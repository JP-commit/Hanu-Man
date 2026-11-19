import * as THREE from 'three';
import { PALETTE } from './toon.js';

const outlineVertexShader = /* glsl */ `
  uniform float uThickness;

  void main() {
    // Inverted-hull: push vertices outward along normal
    vec3 extruded = position + normal * uThickness;
    gl_Position = projectionMatrix * modelViewMatrix * vec4(extruded, 1.0);
  }
`;

const outlineFragmentShader = /* glsl */ `
  uniform vec3 uColor;

  void main() {
    gl_FragColor = vec4(uColor, 1.0);
  }
`;

/**
 * Creates an inverted-hull outline ShaderMaterial.
 *
 * @param {Object} options
 * @param {string|THREE.Color} [options.color] - Outline color (dark warm tone)
 * @param {number} [options.thickness] - Outline extrusion distance
 * @returns {THREE.ShaderMaterial}
 */
export function createOutlineMaterial(options = {}) {
  const color = new THREE.Color(options.color ?? PALETTE.outlineDarkWarm);
  const thickness = options.thickness ?? 0.035;

  return new THREE.ShaderMaterial({
    vertexShader: outlineVertexShader,
    fragmentShader: outlineFragmentShader,
    uniforms: {
      uColor: { value: color },
      uThickness: { value: thickness },
    },
    side: THREE.BackSide,
    depthWrite: true,
  });
}

/**
 * Attaches an inverted-hull outline mesh as a child of the given mesh.
 *
 * @param {THREE.Mesh} mesh - The target mesh to outline
 * @param {Object} options - Outline parameters
 * @returns {THREE.Mesh} The created outline mesh
 */
export function addOutline(mesh, options = {}) {
  const material = createOutlineMaterial(options);
  const outlineMesh = new THREE.Mesh(mesh.geometry, material);
  outlineMesh.name = `${mesh.name || 'mesh'}_outline`;
  // Ensure the outline mesh does not cast or receive shadows
  outlineMesh.castShadow = false;
  outlineMesh.receiveShadow = false;
  mesh.add(outlineMesh);
  return outlineMesh;
}
