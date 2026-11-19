import * as THREE from 'three';
import { STORY_DATA } from './data/story.js';
import { DialogueSystem } from './ui/dialogue.js';

/**
 * Game State Manager for Chapter 1: The Sun
 * States: 'intro' | 'playing' | 'cutscene' | 'chapterEnd'
 */
export class Game {
  constructor({ scene, camera, player, thirdPersonCamera, input, level }) {
    this.scene = scene;
    this.camera = camera;
    this.player = player;
    this.thirdPersonCamera = thirdPersonCamera;
    this.input = input;
    this.level = level;

    this.state = 'intro';
    this.dialogue = new DialogueSystem();

    // Collectibles & Checkpoints
    this.mangoesCollected = 0;
    this.totalMangoes = level.mangoes.length;
    this.checkpointReached = false;
    this.respawnPosition = new THREE.Vector3(0, 0, 10); // Village start

    // Cutscene variables
    this.cutscenePhase = '';
    this.cutsceneTimer = 0.0;
    this.shakeIntensity = 0.0;

    this._createDOM();
    this._startIntro();
  }

  _createDOM() {
    // 1. Mango counter element in HUD
    let mangoHud = document.getElementById('hud-mangoes');
    if (!mangoHud) {
      mangoHud = document.createElement('div');
      mangoHud.id = 'hud-mangoes';
      mangoHud.className = 'hud-mangoes';
      mangoHud.innerHTML = `🥭 <span id="mango-val">0</span> / ${this.totalMangoes}`;
      const hudOverlay = document.querySelector('.hud-overlay');
      if (hudOverlay) {
        hudOverlay.appendChild(mangoHud);
      }
    }
    this.mangoValEl = document.getElementById('mango-val');

    // 2. Checkpoint notification toast
    let toast = document.getElementById('checkpoint-toast');
    if (!toast) {
      toast = document.createElement('div');
      toast.id = 'checkpoint-toast';
      toast.className = 'checkpoint-toast toast-hidden';
      toast.textContent = 'Checkpoint Reached!';
      document.body.appendChild(toast);
    }
    this.toastEl = toast;

    // 3. Chapter Complete End Card
    let endCard = document.getElementById('end-card');
    if (!endCard) {
      endCard = document.createElement('div');
      endCard.id = 'end-card';
      endCard.className = 'end-card end-card-hidden';
      const story = STORY_DATA.chapter1.endCard;

      endCard.innerHTML = `
        <div class="end-card-box">
          <div class="end-card-heading">${story.heading}</div>
          <div class="end-card-subheading">${story.subheading}</div>
          <div class="end-card-summary">${story.summary}</div>
          <div class="end-card-score">
            <span>Mangoes Collected:</span>
            <strong id="end-mango-count">0 / ${this.totalMangoes}</strong>
          </div>
          <button id="btn-restart" class="end-card-btn">${story.restartButton}</button>
        </div>
      `;
      document.body.appendChild(endCard);

      const restartBtn = document.getElementById('btn-restart');
      if (restartBtn) {
        restartBtn.addEventListener('click', () => this.restartChapter());
      }
    }
    this.endCardEl = endCard;
    this.endMangoCountEl = document.getElementById('end-mango-count');

    // Developer debug hotkeys for QA testing
    window.addEventListener('keydown', (e) => {
      if (this.state === 'playing') {
        if (e.code === 'KeyT') {
          // Teleport to summit platform
          this.player.respawn(new THREE.Vector3(8.0, 17.5, -39.0));
        } else if (e.code === 'KeyC') {
          // Teleport to mountain checkpoint
          this.player.respawn(this.level.checkpointPosition.clone());
        }
      }
    });
  }

  // --- Intro Sequence ---
  _startIntro() {
    this.state = 'intro';
    this.player.isCinematic = true;

    // Requirement 4: Camera initially looks high up at the golden sun rising in the sky
    const sunPos = this.level.baseSunPos || new THREE.Vector3(8.0, 42.0, -80.0);
    this.thirdPersonCamera.overridePosition = new THREE.Vector3(0, 3.2, 14.5);
    this.thirdPersonCamera.overrideTarget = sunPos.clone();
    this.thirdPersonCamera.camera.position.copy(this.thirdPersonCamera.overridePosition);
    this.thirdPersonCamera.camera.lookAt(this.thirdPersonCamera.overrideTarget);

    const introLines = STORY_DATA.chapter1.intro;

    this.dialogue.startSequence(
      introLines,
      () => {
        // Dialogue finished: transition to interactive playing
        this.thirdPersonCamera.overridePosition = null;
        this.thirdPersonCamera.overrideTarget = null;
        this.thirdPersonCamera.yaw = 0.0;
        this.thirdPersonCamera.pitch = 0.35;
        this.thirdPersonCamera.distance = 6.5;

        this.state = 'playing';
        this.player.isCinematic = false;
      },
      (line) => {
        if (line.cameraCue === 'zoomSun') {
          // Subtle slow zoom into the sun
          this.thirdPersonCamera.overridePosition = new THREE.Vector3(0, 4.0, 12.0);
        } else if (line.cameraCue === 'panToPlayer') {
          // Requirement 4: Camera smoothly pans down from the sun to child Hanuman in the village
          this.thirdPersonCamera.overridePosition = new THREE.Vector3(0, 2.8, 16.5);
          this.thirdPersonCamera.overrideTarget = this.player.position.clone().add(new THREE.Vector3(0, 1.15, 0));
        }
      }
    );
  }

  // --- Climax Summit Leap & Indra's Strike ---
  _startSummitCutscene() {
    this.state = 'cutscene';
    this.cutscenePhase = 'summit_dialogue';
    this.player.isCinematic = true;
    this.player.velocity.set(0, 0, 0);

    // Turn Hanuman to face the glorious sun
    this.player.facingAngle = Math.PI; // Face negative Z (towards the sun)
    this.player.mesh.rotation.y = this.player.facingAngle;

    // Focus camera on Hanuman at the summit dais
    this.thirdPersonCamera.yaw = 0.15;
    this.thirdPersonCamera.pitch = 0.32;
    this.thirdPersonCamera.distance = 5.5;

    this.dialogue.startSequence(
      STORY_DATA.chapter1.summit,
      () => {
        // Dialogue closed: launch the great leap!
        this._launchSummitLeap();
      }
    );
  }

  _launchSummitLeap() {
    this.cutscenePhase = 'leaping';
    this.cutsceneTimer = 0.0;

    // Big upward velocity towards the celestial sun
    this.player.velocity.set(0, 16.0, -10.0);
    this.player.squash = 1.6; // Dramatic leap stretch
  }

  _triggerIndraStrike() {
    this.cutscenePhase = 'indra_strike';
    this.cutsceneTimer = 0.0;

    // 1. Blinding white screen flash
    this.dialogue.triggerFlash(900);

    // 2. Violent screen shake
    this.shakeIntensity = 24.0;

    // 3. Hanuman is struck by the Vajra, begins falling slowly
    this.player.velocity.set(0, -5.5, 3.0);

    // 4. Narrator dialogue lines
    setTimeout(() => {
      this.dialogue.startSequence(
        STORY_DATA.chapter1.indraStrike,
        () => {
          this._showChapterEnd();
        },
        (line) => {
          if (line.action === 'flashAndShake') {
            this.dialogue.triggerFlash(700);
            this.shakeIntensity = 18.0;
          }
        }
      );
    }, 400);
  }

  _showChapterEnd() {
    this.state = 'chapterEnd';
    if (this.endCardEl) {
      this.endCardEl.classList.remove('end-card-hidden');
    }
    if (this.endMangoCountEl) {
      this.endMangoCountEl.textContent = `${this.mangoesCollected} / ${this.totalMangoes}`;
    }
  }

  restartChapter() {
    if (this.endCardEl) {
      this.endCardEl.classList.add('end-card-hidden');
    }

    // Reset collectibles
    this.mangoesCollected = 0;
    if (this.mangoValEl) {
      this.mangoValEl.textContent = '0';
    }
    this.level.mangoes.forEach((mango) => {
      mango.collected = false;
      mango.mesh.visible = true;
    });

    // Reset checkpoint
    this.checkpointReached = false;
    this.respawnPosition.set(0, 0, 10);

    // Reset player
    this.player.respawn(this.respawnPosition);
    this.player.facingAngle = 0;
    this.player.mesh.rotation.y = 0;

    // Restart intro
    this._startIntro();
  }

  _showCheckpointToast() {
    if (!this.toastEl) return;
    this.toastEl.classList.remove('toast-hidden');
    setTimeout(() => {
      this.toastEl.classList.add('toast-hidden');
    }, 2500);
  }

  update(time, delta) {
    // Apply camera shake if active
    if (this.shakeIntensity > 0.01) {
      const shakeX = (Math.random() - 0.5) * this.shakeIntensity * 0.04;
      const shakeY = (Math.random() - 0.5) * this.shakeIntensity * 0.04;
      this.camera.position.x += shakeX;
      this.camera.position.y += shakeY;
      this.shakeIntensity = Math.max(0, this.shakeIntensity - 35.0 * delta);
    }

    // --- State: Playing ---
    if (this.state === 'playing') {
      const playerPos = this.player.position;

      // 1. Mango collection
      this.level.mangoes.forEach((mango) => {
        if (!mango.collected) {
          const dist = playerPos.distanceTo(mango.mesh.position);
          if (dist < mango.radius + this.player.radius + 0.3) {
            mango.collected = true;
            mango.mesh.visible = false;
            this.mangoesCollected++;
            if (this.mangoValEl) {
              this.mangoValEl.textContent = `${this.mangoesCollected}`;
            }
          }
        }
      });

      // 2. Checkpoint detection (Mountain Ridge)
      if (!this.checkpointReached) {
        const cp = this.level.checkpointPosition;
        const dx = Math.abs(playerPos.x - cp.x);
        const dz = Math.abs(playerPos.z - cp.z);
        if (dx < 3.5 && dz < 4.0 && playerPos.y >= 5.8) {
          this.checkpointReached = true;
          this.respawnPosition.copy(cp);
          this._showCheckpointToast();
        }
      }

      // 3. Fall-off respawn
      if (playerPos.y < -8.0) {
        this.player.respawn(this.respawnPosition);
      }

      // 4. Summit Climax Trigger
      const summit = this.level.summitTrigger;
      const distToSummit = playerPos.distanceTo(summit.center);
      if (distToSummit < summit.radius && playerPos.y >= 16.5) {
        this._startSummitCutscene();
      }
    }

    // --- State: Cutscene ---
    if (this.state === 'cutscene') {
      if (this.cutscenePhase === 'leaping') {
        this.cutsceneTimer += delta;

        // Camera tracks the ascending jump
        this.thirdPersonCamera.pitch = Math.min(1.15, this.thirdPersonCamera.pitch + 0.45 * delta);
        this.thirdPersonCamera.distance = Math.min(14.0, this.thirdPersonCamera.distance + 2.5 * delta);

        // Expand the sun as Hanuman approaches
        const sunScale = 1.75 + this.cutsceneTimer * 1.5;
        this.level.sunGroup.scale.set(sunScale, sunScale, sunScale);

        // After 2.0s of glorious ascent, Indra strikes!
        if (this.cutsceneTimer > 2.0) {
          this._triggerIndraStrike();
        }
      } else if (this.cutscenePhase === 'indra_strike') {
        // Tumble rotation while falling
        this.player.mesh.rotation.x += 2.0 * delta;
        this.player.mesh.rotation.z += 1.5 * delta;

        // Settle near the summit platform level
        if (this.player.position.y < 12.0) {
          this.player.velocity.set(0, 0, 0);
        }
      }
    }
  }
}
