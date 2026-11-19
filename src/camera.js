import * as THREE from 'three';

/**
 * Third-person follow camera with smooth lag, mouse drag orbiting, and scroll zooming.
 */
export class ThirdPersonCamera {
  constructor(camera, targetObject, domElement = window) {
    this.camera = camera;
    this.targetObject = targetObject;
    this.domElement = domElement;

    // Spherical angles relative to target
    this.yaw = 0.0;             // horizontal angle around target
    this.pitch = 0.35;          // vertical angle (radians above horizon)
    this.distance = 6.5;        // distance from target

    this.minDistance = 3.0;
    this.maxDistance = 16.0;
    this.minPitch = 0.05;       // Just above ground level
    this.maxPitch = 1.40;       // Almost top-down (approx 80 degrees)

    this.lookSensitivity = 0.005;
    this.zoomSensitivity = 0.8;
    this.followSpeed = 12.0;

    // Offset above player base position (looking at upper chest/head level)
    this.targetOffset = new THREE.Vector3(0, 1.35, 0);

    // Current smoothed target and camera positions
    this.smoothedTarget = new THREE.Vector3();
    this.smoothedPosition = new THREE.Vector3();

    // Initialize to target position if available
    if (this.targetObject) {
      this.smoothedTarget.copy(this.targetObject.position).add(this.targetOffset);
      this._computeDesiredPosition(this.smoothedPosition);
      this.camera.position.copy(this.smoothedPosition);
      this.camera.lookAt(this.smoothedTarget);
    }
  }

  _computeDesiredPosition(outVec) {
    // Spherical coordinates:
    // pitch is angle above horizontal ground plane
    const horizontalDist = this.distance * Math.cos(this.pitch);
    outVec.x = this.smoothedTarget.x + horizontalDist * Math.sin(this.yaw);
    outVec.y = this.smoothedTarget.y + this.distance * Math.sin(this.pitch);
    outVec.z = this.smoothedTarget.z + horizontalDist * Math.cos(this.yaw);
    return outVec;
  }

  /**
   * Horizontal unit vector pointing forward relative to current camera yaw
   */
  getHorizontalForward() {
    return new THREE.Vector3(-Math.sin(this.yaw), 0, -Math.cos(this.yaw)).normalize();
  }

  /**
   * Horizontal unit vector pointing right relative to current camera yaw
   */
  getHorizontalRight() {
    return new THREE.Vector3(Math.cos(this.yaw), 0, -Math.sin(this.yaw)).normalize();
  }

  update(delta, input) {
    // 1. Process mouse/touch look drag
    if (input.axes.lookDeltaX !== 0 || input.axes.lookDeltaY !== 0) {
      this.yaw -= input.axes.lookDeltaX * this.lookSensitivity;
      this.pitch += input.axes.lookDeltaY * this.lookSensitivity;
      this.pitch = Math.max(this.minPitch, Math.min(this.maxPitch, this.pitch));
    }

    // 2. Process scroll zoom
    if (input.axes.zoomDelta !== 0) {
      this.distance += input.axes.zoomDelta * this.zoomSensitivity;
      this.distance = Math.max(this.minDistance, Math.min(this.maxDistance, this.distance));
    }

    // 3. Smoothly follow target position
    if (this.targetObject) {
      const targetPos = this.targetObject.position.clone().add(this.targetOffset);
      const lerpFactor = 1.0 - Math.exp(-this.followSpeed * delta);
      this.smoothedTarget.lerp(targetPos, lerpFactor);

      const desiredPos = new THREE.Vector3();
      this._computeDesiredPosition(desiredPos);

      this.smoothedPosition.lerp(desiredPos, lerpFactor);
      this.camera.position.copy(this.smoothedPosition);
      this.camera.lookAt(this.smoothedTarget);
    }
  }
}
