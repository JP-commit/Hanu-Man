import * as THREE from 'three';

/**
 * Third-person follow camera with smooth lag, mouse drag orbiting, scroll zooming,
 * cutscene override targets, and collision clearance.
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

    this.minDistance = 2.8;
    this.maxDistance = 16.0;
    this.minPitch = 0.05;       // Just above ground level
    this.maxPitch = 1.40;       // Almost top-down (approx 80 degrees)

    this.lookSensitivity = 0.005;
    this.zoomSensitivity = 0.8;
    this.followSpeed = 10.0;

    // Offset above player base position (looking at upper chest/head level)
    this.targetOffset = new THREE.Vector3(0, 1.15, 0);

    // Current smoothed target and camera positions
    this.smoothedTarget = new THREE.Vector3();
    this.smoothedPosition = new THREE.Vector3();

    // Cinematic override vectors (for cutscenes like intro sunrise pan)
    this.overrideTarget = null;
    this.overridePosition = null;

    // Raycaster for camera wall collision prevention
    this.raycaster = new THREE.Raycaster();

    if (this.targetObject) {
      this.smoothedTarget.copy(this.targetObject.position).add(this.targetOffset);
      this._computeDesiredPosition(this.smoothedPosition);
      this.camera.position.copy(this.smoothedPosition);
      this.camera.lookAt(this.smoothedTarget);
    }
  }

  _computeDesiredPosition(outVec) {
    const horizontalDist = this.distance * Math.cos(this.pitch);
    outVec.x = this.smoothedTarget.x + horizontalDist * Math.sin(this.yaw);
    outVec.y = this.smoothedTarget.y + this.distance * Math.sin(this.pitch);
    outVec.z = this.smoothedTarget.z + horizontalDist * Math.cos(this.yaw);
    return outVec;
  }

  getHorizontalForward() {
    return new THREE.Vector3(-Math.sin(this.yaw), 0, -Math.cos(this.yaw)).normalize();
  }

  getHorizontalRight() {
    return new THREE.Vector3(Math.cos(this.yaw), 0, -Math.sin(this.yaw)).normalize();
  }

  update(delta, input, colliders = []) {
    // 1. Process mouse/touch look drag (disabled during active override)
    if (!this.overrideTarget) {
      if (input.axes.lookDeltaX !== 0 || input.axes.lookDeltaY !== 0) {
        this.yaw -= input.axes.lookDeltaX * this.lookSensitivity;
        this.pitch += input.axes.lookDeltaY * this.lookSensitivity;
        this.pitch = Math.max(this.minPitch, Math.min(this.maxPitch, this.pitch));
      }

      if (input.axes.zoomDelta !== 0) {
        this.distance += input.axes.zoomDelta * this.zoomSensitivity;
        this.distance = Math.max(this.minDistance, Math.min(this.maxDistance, this.distance));
      }
    }

    // 2. Compute Target & Position
    if (this.overrideTarget && this.overridePosition) {
      // Cinematic cutscene mode: smoothly pan towards specified camera position & look target
      const lerpFactor = 1.0 - Math.exp(-4.5 * delta);
      this.smoothedTarget.lerp(this.overrideTarget, lerpFactor);
      this.smoothedPosition.lerp(this.overridePosition, lerpFactor);

      this.camera.position.copy(this.smoothedPosition);
      this.camera.lookAt(this.smoothedTarget);
    } else if (this.targetObject) {
      // Standard gameplay follow mode
      const targetPos = this.targetObject.position.clone().add(this.targetOffset);
      const lerpFactor = 1.0 - Math.exp(-this.followSpeed * delta);
      this.smoothedTarget.lerp(targetPos, lerpFactor);

      const desiredPos = new THREE.Vector3();
      this._computeDesiredPosition(desiredPos);

      // Camera collision prevention against level colliders
      let actualDesiredPos = desiredPos;
      if (colliders && colliders.length > 0) {
        const camDir = new THREE.Vector3().subVectors(desiredPos, this.smoothedTarget);
        const maxDist = camDir.length();
        camDir.normalize();

        const ray = new THREE.Ray(this.smoothedTarget, camDir);
        let closestHitDist = maxDist;

        for (const box of colliders) {
          const hit = ray.intersectBox(box, new THREE.Vector3());
          if (hit) {
            const hitDist = this.smoothedTarget.distanceTo(hit);
            if (hitDist < closestHitDist) {
              closestHitDist = Math.max(1.8, hitDist - 0.35);
            }
          }
        }

        if (closestHitDist < maxDist) {
          actualDesiredPos = this.smoothedTarget.clone().addScaledVector(camDir, closestHitDist);
        }
      }

      this.smoothedPosition.lerp(actualDesiredPos, lerpFactor);
      this.camera.position.copy(this.smoothedPosition);
      this.camera.lookAt(this.smoothedTarget);
    }
  }
}
