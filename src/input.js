/**
 * Input system decoupled from DOM events for keyboard, mouse, and future touch remapping.
 */
export class Input {
  constructor(domElement = window) {
    this.domElement = domElement;

    // Abstract action states (can be driven by keyboard, gamepad, or touch UI)
    this.actions = {
      jump: false,
      jumpJustPressed: false,
      sprint: false,
    };

    // Abstract 2D axes
    this.axes = {
      moveX: 0, // -1 (left) to 1 (right)
      moveY: 0, // 1 (forward) to -1 (backward)
      lookDeltaX: 0, // mouse/touch drag X
      lookDeltaY: 0, // mouse/touch drag Y
      zoomDelta: 0,  // scroll wheel
    };

    // Active keys set
    this.keysDown = new Set();

    // Mouse drag state
    this.isDragging = false;
    this.lastPointerX = 0;
    this.lastPointerY = 0;

    this._onKeyDown = this._onKeyDown.bind(this);
    this._onKeyUp = this._onKeyUp.bind(this);
    this._onMouseDown = this._onMouseDown.bind(this);
    this._onMouseMove = this._onMouseMove.bind(this);
    this._onMouseUp = this._onMouseUp.bind(this);
    this._onWheel = this._onWheel.bind(this);
    this._onTouchStart = this._onTouchStart.bind(this);
    this._onTouchMove = this._onTouchMove.bind(this);
    this._onTouchEnd = this._onTouchEnd.bind(this);

    this._attachListeners();
  }

  _attachListeners() {
    window.addEventListener('keydown', this._onKeyDown);
    window.addEventListener('keyup', this._onKeyUp);

    // Mouse drag for camera orbit
    window.addEventListener('mousedown', this._onMouseDown);
    window.addEventListener('mousemove', this._onMouseMove);
    window.addEventListener('mouseup', this._onMouseUp);
    window.addEventListener('wheel', this._onWheel, { passive: false });

    // Touch support for camera and touch remapping
    window.addEventListener('touchstart', this._onTouchStart, { passive: true });
    window.addEventListener('touchmove', this._onTouchMove, { passive: true });
    window.addEventListener('touchend', this._onTouchEnd, { passive: true });
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

  _onMouseDown(e) {
    this.isDragging = true;
    this.lastPointerX = e.clientX;
    this.lastPointerY = e.clientY;
  }

  _onMouseMove(e) {
    if (!this.isDragging) return;
    const dx = e.clientX - this.lastPointerX;
    const dy = e.clientY - this.lastPointerY;
    this.lastPointerX = e.clientX;
    this.lastPointerY = e.clientY;

    this.axes.lookDeltaX += dx;
    this.axes.lookDeltaY += dy;
  }

  _onMouseUp() {
    this.isDragging = false;
  }

  _onWheel(e) {
    this.axes.zoomDelta += Math.sign(e.deltaY);
  }

  _onTouchStart(e) {
    if (e.touches.length === 1) {
      this.isDragging = true;
      this.lastPointerX = e.touches[0].clientX;
      this.lastPointerY = e.touches[0].clientY;
    }
  }

  _onTouchMove(e) {
    if (!this.isDragging || e.touches.length !== 1) return;
    const dx = e.touches[0].clientX - this.lastPointerX;
    const dy = e.touches[0].clientY - this.lastPointerY;
    this.lastPointerX = e.touches[0].clientX;
    this.lastPointerY = e.touches[0].clientY;

    this.axes.lookDeltaX += dx;
    this.axes.lookDeltaY += dy;
  }

  _onTouchEnd() {
    this.isDragging = false;
  }

  /**
   * Helper to manually drive action states (e.g. from virtual on-screen touch buttons)
   */
  setAction(name, value) {
    if (name === 'jump' && value && !this.actions.jump) {
      this.actions.jumpJustPressed = true;
    }
    this.actions[name] = !!value;
  }

  /**
   * Helper to manually drive movement axes (e.g. from virtual joystick)
   */
  setAxis(name, value) {
    this.axes[name] = value;
  }

  /**
   * Call at the end of each frame to reset instantaneous deltas
   */
  update() {
    this.actions.jumpJustPressed = false;
    this.axes.lookDeltaX = 0;
    this.axes.lookDeltaY = 0;
    this.axes.zoomDelta = 0;
  }

  destroy() {
    window.removeEventListener('keydown', this._onKeyDown);
    window.removeEventListener('keyup', this._onKeyUp);
    window.removeEventListener('mousedown', this._onMouseDown);
    window.removeEventListener('mousemove', this._onMouseMove);
    window.removeEventListener('mouseup', this._onMouseUp);
    window.removeEventListener('wheel', this._onWheel);
    window.removeEventListener('touchstart', this._onTouchStart);
    window.removeEventListener('touchmove', this._onTouchMove);
    window.removeEventListener('touchend', this._onTouchEnd);
  }
}
