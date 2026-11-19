/**
 * Input system supporting keyboard, mouse movement camera look,
 * pointer lock, and mobile touch controls.
 */
export class Input {
  constructor(domElement = window) {
    this.domElement = domElement;

    // Abstract action states
    this.actions = {
      jump: false,
      jumpJustPressed: false,
      sprint: false,
    };

    // Abstract 2D axes
    this.axes = {
      moveX: 0,      // -1 (left) to 1 (right)
      moveY: 0,      // 1 (forward) to -1 (backward)
      lookDeltaX: 0, // mouse movement X
      lookDeltaY: 0, // mouse movement Y
      zoomDelta: 0,  // scroll wheel
    };

    this.keysDown = new Set();

    this.hasMovedMouse = false;
    this.lastPointerX = 0;
    this.lastPointerY = 0;
    this.isTouching = false;

    this._onKeyDown = this._onKeyDown.bind(this);
    this._onKeyUp = this._onKeyUp.bind(this);
    this._onMouseMove = this._onMouseMove.bind(this);
    this._onClick = this._onClick.bind(this);
    this._onWheel = this._onWheel.bind(this);
    this._onTouchStart = this._onTouchStart.bind(this);
    this._onTouchMove = this._onTouchMove.bind(this);
    this._onTouchEnd = this._onTouchEnd.bind(this);

    this._attachListeners();
  }

  _attachListeners() {
    window.addEventListener('keydown', this._onKeyDown);
    window.addEventListener('keyup', this._onKeyUp);

    // Requirement 4: Camera rotation responds directly to mouse movement
    window.addEventListener('mousemove', this._onMouseMove);
    window.addEventListener('click', this._onClick);
    window.addEventListener('wheel', this._onWheel, { passive: false });

    // Touch controls for mobile / touchscreen
    window.addEventListener('touchstart', this._onTouchStart, { passive: true });
    window.addEventListener('touchmove', this._onTouchMove, { passive: true });
    window.addEventListener('touchend', this._onTouchEnd, { passive: true });
  }

  _onClick(e) {
    // Optionally engage pointer lock on canvas click for smooth 360 camera control
    const target = e.target;
    if (target && target.tagName === 'CANVAS' && !document.pointerLockElement) {
      target.requestPointerLock?.();
    }
  }

  _onKeyDown(e) {
    if (e.repeat) return;
    this.keysDown.add(e.code);

    if (e.code === 'Space') {
      this.actions.jump = true;
      this.actions.jumpJustPressed = true;
      e.preventDefault();
    }
    if (e.code === 'ShiftLeft' || e.code === 'ShiftRight') {
      this.actions.sprint = true;
    }

    this._updateAxesFromKeys();
  }

  _onKeyUp(e) {
    this.keysDown.delete(e.code);

    if (e.code === 'Space') {
      this.actions.jump = false;
    }
    if (e.code === 'ShiftLeft' || e.code === 'ShiftRight') {
      this.actions.sprint = false;
    }

    this._updateAxesFromKeys();
  }

  _updateAxesFromKeys() {
    let x = 0;
    let y = 0;

    if (this.keysDown.has('KeyA') || this.keysDown.has('ArrowLeft')) x -= 1;
    if (this.keysDown.has('KeyD') || this.keysDown.has('ArrowRight')) x += 1;
    if (this.keysDown.has('KeyW') || this.keysDown.has('ArrowUp')) y += 1;
    if (this.keysDown.has('KeyS') || this.keysDown.has('ArrowDown')) y -= 1;

    this.axes.moveX = x;
    this.axes.moveY = y;
  }

  _onMouseMove(e) {
    if (document.pointerLockElement) {
      // Precise pointer lock delta
      this.axes.lookDeltaX += e.movementX;
      this.axes.lookDeltaY += e.movementY;
    } else {
      // Standard window mouse movement tracking
      if (!this.hasMovedMouse) {
        this.lastPointerX = e.clientX;
        this.lastPointerY = e.clientY;
        this.hasMovedMouse = true;
        return;
      }

      const dx = e.clientX - this.lastPointerX;
      const dy = e.clientY - this.lastPointerY;
      this.lastPointerX = e.clientX;
      this.lastPointerY = e.clientY;

      // Filter out huge single-frame leaps when entering window
      if (Math.abs(dx) < 250 && Math.abs(dy) < 250) {
        this.axes.lookDeltaX += dx;
        this.axes.lookDeltaY += dy;
      }
    }
  }

  _onWheel(e) {
    this.axes.zoomDelta += Math.sign(e.deltaY);
  }

  _onTouchStart(e) {
    if (e.touches.length === 1) {
      this.isTouching = true;
      this.lastPointerX = e.touches[0].clientX;
      this.lastPointerY = e.touches[0].clientY;
    }
  }

  _onTouchMove(e) {
    if (!this.isTouching || e.touches.length !== 1) return;
    const dx = e.touches[0].clientX - this.lastPointerX;
    const dy = e.touches[0].clientY - this.lastPointerY;
    this.lastPointerX = e.touches[0].clientX;
    this.lastPointerY = e.touches[0].clientY;

    this.axes.lookDeltaX += dx;
    this.axes.lookDeltaY += dy;
  }

  _onTouchEnd() {
    this.isTouching = false;
  }

  setAction(name, value) {
    if (name === 'jump' && value && !this.actions.jump) {
      this.actions.jumpJustPressed = true;
    }
    this.actions[name] = !!value;
  }

  setAxis(name, value) {
    this.axes[name] = value;
  }

  update() {
    this.actions.jumpJustPressed = false;
    this.axes.lookDeltaX = 0;
    this.axes.lookDeltaY = 0;
    this.axes.zoomDelta = 0;
  }

  destroy() {
    window.removeEventListener('keydown', this._onKeyDown);
    window.removeEventListener('keyup', this._onKeyUp);
    window.removeEventListener('mousemove', this._onMouseMove);
    window.removeEventListener('click', this._onClick);
    window.removeEventListener('wheel', this._onWheel);
    window.removeEventListener('touchstart', this._onTouchStart);
    window.removeEventListener('touchmove', this._onTouchMove);
    window.removeEventListener('touchend', this._onTouchEnd);
  }
}
