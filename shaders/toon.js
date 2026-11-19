import * as THREE from 'three';

/**
 * Locked color palette from PROJECT.md
 */
export const PALETTE = {
  terracottaRed: '#C8645A',
  terracottaRedShadow: '#A04A42',
  warmSand: '#F0C9A0',
  warmSandMid: '#E0B584',
  warmSandShadow: '#CCA070',
  softWhite: '#F4EFE6',
  softWhiteMid: '#E5DED0',
  softWhiteShadow: '#C8BCAB',
  tealDome: '#5E9C94',
  tealDomeMid: '#4F847D',
  tealDomeShadow: '#3B645E',
  skyBlue: '#7FB0E8',
  hanumanOrange: '#E8833A',
  hanumanOrangeMid: '#C8645A',
  hanumanOrangeShadow: '#8C3B34',
  outlineDarkWarm: '#381F15',
};

// Default directional sun vector pointing from upper sky
export const defaultSunDirection = new THREE.Vector3(1.2, 1.8, 1.0).normalize();

const toonVertexShader = /* glsl */ `
  varying vec3 vWorldNormal;
  varying vec3 vWorldPosition;

  void main() {
    vWorldNormal = normalize((modelMatrix * vec4(normal, 0.0)).xyz);
    vec4 worldPos = modelMatrix * vec4(position, 1.0);
    vWorldPosition = worldPos.xyz;
    gl_Position = projectionMatrix * viewMatrix * worldPos;
  }
`;

const toonFragmentShader = /* glsl */ `
  uniform vec3 uHighlightColor;
  uniform vec3 uMidColor;
  uniform vec3 uShadowColor;
  uniform vec3 uLightDirection;
  uniform vec2 uThresholds; // x: shadow-to-mid, y: mid-to-highlight

  varying vec3 vWorldNormal;
  varying vec3 vWorldPosition;

  void main() {
    vec3 normal = normalize(vWorldNormal);
    vec3 lightDir = normalize(uLightDirection);

    float nDotL = dot(normal, lightDir);

    // 3 discrete, crisp flat colour bands (no smooth gradients)
    vec3 finalColor;
    if (nDotL > uThresholds.y) {
      finalColor = uHighlightColor;
    } else if (nDotL > uThresholds.x) {
      finalColor = uMidColor;
    } else {
      finalColor = uShadowColor;
    }

    gl_FragColor = vec4(finalColor, 1.0);
  }
`;

/**
 * Creates a 3-band cel-shaded ShaderMaterial.
 *
 * @param {Object} options
 * @param {string|THREE.Color} [options.color] - Base/highlight color
 * @param {string|THREE.Color} [options.midColor] - Middle tone color band
 * @param {string|THREE.Color} [options.shadowColor] - Shadow tone color band
 * @param {THREE.Vector3} [options.lightDirection] - Sun light direction vector
 * @param {[number, number]} [options.thresholds] - Transition boundaries [shadow->mid, mid->highlight]
 * @returns {THREE.ShaderMaterial}
 */
export function createToonMaterial(options = {}) {
  const highlightColor = new THREE.Color(options.color ?? PALETTE.hanumanOrange);

  const midColor = options.midColor
    ? new THREE.Color(options.midColor)
    : highlightColor.clone().lerp(new THREE.Color('#944230'), 0.35).multiplyScalar(0.85);

  const shadowColor = options.shadowColor
    ? new THREE.Color(options.shadowColor)
    : highlightColor.clone().lerp(new THREE.Color('#4A2016'), 0.65).multiplyScalar(0.65);

  const lightDirection = options.lightDirection ?? defaultSunDirection;
  const thresholds = options.thresholds ?? [-0.05, 0.45];

  return new THREE.ShaderMaterial({
    vertexShader: toonVertexShader,
    fragmentShader: toonFragmentShader,
    uniforms: {
      uHighlightColor: { value: highlightColor },
      uMidColor: { value: midColor },
      uShadowColor: { value: shadowColor },
      uLightDirection: { value: lightDirection },
      uThresholds: { value: new THREE.Vector2(thresholds[0], thresholds[1]) },
    },
  });
}
