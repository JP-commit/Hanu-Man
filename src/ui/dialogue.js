/**
 * Dialogue & Cutscene System:
 * - Bottom-anchored dialogue box
 * - Character-by-character typewriter text effect
 * - Space key and tap/click to advance or skip typewriter
 * - Callback hooks for camera moves and cinematic action triggers
 */
export class DialogueSystem {
  constructor() {
    this.container = null;
    this.speakerEl = null;
    this.textEl = null;
    this.promptEl = null;
    this.flashEl = null;

    this.currentLines = [];
    this.currentIndex = -1;
    this.isTyping = false;
    this.fullText = '';
    this.typewriterTimer = null;
    this.typewriterIndex = 0;
    this.typingSpeedMs = 28;

    this.onSequenceComplete = null;
    this.onLineChange = null;

    this._createDOM();
    this._attachEvents();
  }

  _createDOM() {
    // 1. White screen flash element for Indra's strike
    let flash = document.getElementById('screen-flash');
    if (!flash) {
      flash = document.createElement('div');
      flash.id = 'screen-flash';
      flash.className = 'screen-flash';
      document.body.appendChild(flash);
    }
    this.flashEl = flash;

    // 2. Dialogue Box Container
    let box = document.getElementById('dialogue-box');
    if (!box) {
      box = document.createElement('div');
      box.id = 'dialogue-box';
      box.className = 'dialogue-box dialogue-hidden';

      box.innerHTML = `
        <div class="dialogue-inner">
          <div class="dialogue-speaker" id="dialogue-speaker">Hanuman</div>
          <div class="dialogue-text" id="dialogue-text"></div>
          <div class="dialogue-prompt" id="dialogue-prompt">Press Space or Tap to continue ▼</div>
        </div>
      `;
      document.body.appendChild(box);
    }

    this.container = box;
    this.speakerEl = document.getElementById('dialogue-speaker');
    this.textEl = document.getElementById('dialogue-text');
    this.promptEl = document.getElementById('dialogue-prompt');
  }

  _attachEvents() {
    this._onAdvance = this._onAdvance.bind(this);

    window.addEventListener('keydown', (e) => {
      if (this.isActive() && (e.code === 'Space' || e.code === 'Enter')) {
        e.preventDefault();
        this._onAdvance();
      }
    });

    if (this.container) {
      this.container.addEventListener('pointerdown', (e) => {
        if (this.isActive()) {
          e.stopPropagation();
          this._onAdvance();
        }
      });
    }
  }

  isActive() {
    return this.container && !this.container.classList.contains('dialogue-hidden');
  }

  /**
   * Starts a series of dialogue lines with optional camera/action cues.
   *
   * @param {Array<Object>} lines - Array of { speaker, text, cameraCue, action }
   * @param {Function} [onComplete] - Called when the last line finishes
   * @param {Function} [onLineChange] - Called on each line with (lineData, index)
   */
  startSequence(lines, onComplete = null, onLineChange = null) {
    if (!lines || lines.length === 0) {
      if (onComplete) onComplete();
      return;
    }

    this.currentLines = lines;
    this.currentIndex = -1;
    this.onSequenceComplete = onComplete;
    this.onLineChange = onLineChange;

    this.container.classList.remove('dialogue-hidden');
    this._next();
  }

  _next() {
    this.currentIndex++;
    if (this.currentIndex >= this.currentLines.length) {
      this.close();
      if (this.onSequenceComplete) {
        const cb = this.onSequenceComplete;
        this.onSequenceComplete = null;
        cb();
      }
      return;
    }

    const line = this.currentLines[this.currentIndex];
    this.speakerEl.textContent = line.speaker || 'Narrator';
    this.fullText = line.text || '';
    this.textEl.textContent = '';
    this.promptEl.classList.remove('prompt-visible');

    // Notify listeners (camera pans, screen effects)
    if (this.onLineChange) {
      this.onLineChange(line, this.currentIndex);
    }

    // Start typewriter
    this._startTypewriter();
  }

  _startTypewriter() {
    clearInterval(this.typewriterTimer);
    this.isTyping = true;
    this.typewriterIndex = 0;

    this.typewriterTimer = setInterval(() => {
      if (this.typewriterIndex < this.fullText.length) {
        this.textEl.textContent += this.fullText[this.typewriterIndex];
        this.typewriterIndex++;
      } else {
        this._finishTypewriter();
      }
    }, this.typingSpeedMs);
  }

  _finishTypewriter() {
    clearInterval(this.typewriterTimer);
    this.textEl.textContent = this.fullText;
    this.isTyping = false;
    this.promptEl.classList.add('prompt-visible');
  }

  _onAdvance() {
    if (this.isTyping) {
      // First click/press skips typewriter to show full text instantly
      this._finishTypewriter();
    } else {
      // Second click/press advances to next line
      this._next();
    }
  }

  close() {
    clearInterval(this.typewriterTimer);
    this.isTyping = false;
    if (this.container) {
      this.container.classList.add('dialogue-hidden');
    }
  }

  /**
   * Triggers a blinding white lightning flash (for Indra's strike).
   */
  triggerFlash(durationMs = 800) {
    if (!this.flashEl) return;
    this.flashEl.classList.add('flash-active');
    setTimeout(() => {
      this.flashEl.classList.remove('flash-active');
    }, durationMs);
  }
}
