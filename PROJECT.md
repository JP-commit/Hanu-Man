# Hanuman Game: PROJECT.md

> Read this file at the start of every session. Update the "Progress" section at the end of every session.

## Concept
A 3D third-person adventure game based on the story of Hanuman. The player controls Hanuman.
- Starts: child Hanuman jumps to the sun, thinking it is a mango.
- Ends: Lord Ram brings Sita back from Lanka.

## Tech
- Web game using Three.js + Vite (plain JavaScript, no heavy frameworks)
- Runs in the browser, no installs beyond Node
- Keep code modular: one file per system (player, camera, level, ui, shaders)
- Prefer simple, readable code over clever code
- Commit to Git after every working step

## Art Style (locked)
- Cel-shaded 3D with flat colour bands (2-3 shades per material, no smooth gradients)
- Thin dark-warm outline around characters and buildings
- Palette:
  - Terracotta red cliffs: #C8645A / #A04A42
  - Warm sand ground: #F0C9A0
  - Soft white architecture: #F4EFE6
  - Teal domes: #5E9C94
  - Sky blue: #7FB0E8, with hand-painted style white clouds
  - Hanuman outfit accent: orange #E8833A
- Mood: calm, bright, sunlit desert, grand white temple architecture, big open skies

## Story Chapters
1. The Sun (child Hanuman)
2. Growing Up (curse, Jambavan reminds him of his powers)
3. Leap to Lanka (ocean crossing)
4. Lanka (find Sita, ring, tail on fire)
5. The Return (Sanjeevani, Ram and Sita)

## Stages
- [x] Stage 0: Foundation (project setup, cel shader, outline, palette)
- [x] Stage 1: Core movement (run, jump, camera, collisions)
- [x] Stage 2: Chapter 1, The Sun
- [ ] Stage 3: Chapter 2, Growing Up
- [ ] Stage 4: Chapter 3, Leap to Lanka
- [ ] Stage 5: Chapter 4, Lanka
- [ ] Stage 6: Chapter 5, The Return
- [ ] Stage 7: Art pass
- [ ] Stage 8: Audio, polish, UI

## Rules for the AI agent
- Work on ONE stage per session. Do not start the next stage.
- Before changing code, briefly state the plan.
- After finishing, run the project and confirm it works.
- Never delete working code without asking.
- Update Progress below when done.

## Progress
- **Stage 0: Foundation** completed:
  - Initialized Vite + Three.js project with plain JavaScript and dev/build scripts.
  - Built 3D scene with sky-blue background (`#7FB0E8`) and warm sand ground plane (`#F0C9A0`).
  - Implemented 3-band cel shader (`shaders/toon.js`) using the project art palette.
  - Implemented inverted-hull dark-warm outline shader (`shaders/outline.js`, `#381F15`) applied to the test capsule.
  - Added directional sunlight, stylized sun disc in the sky, and soft flat white cloud shapes drifting gently.
  - Added slow orbit camera with smooth damping and interactive controls.
  - Modularized code into `main.js`, `scene.js`, `shaders/toon.js`, and `shaders/outline.js`.
  - Verified clean build and runtime rendering with zero console or shader errors.

- **Stage 1: Core movement** completed:
  - Replaced test capsule with player placeholder character (capsule body + sphere head, orange accent palette `#E8833A`, cel-shaded with inverted-hull outline) in `src/player.js`.
  - Implemented decoupled input system (`src/input.js`) supporting WASD/arrows, Shift sprint, Space jump, mouse drag look, and scroll zoom, ready for touch/gamepad remapping.
  - Implemented third-person follow camera (`src/camera.js`) with smooth positional lag, spherical yaw/pitch drag, and bounded scroll zoom.
  - Implemented lightweight custom physics: gravity, ground check, variable jump height (higher on hold), 0.1s coyote-time window, and 0.15s jump buffering.
  - Implemented AABB collision resolution preventing walking through boxes, enabling wall sliding, platform landing, and bridge crossing.
  - Built test level (`src/level.js`) featuring flat sand ground, multiple terracotta cliff platforms of varying heights, an elevated narrow bridge, and white stepping pillars.
  - Added smooth character yaw rotation facing movement direction relative to camera heading with procedural run bob/tilt.
  - Added real-time debug overlay in HUD tracking FPS, Grounded state, and Speed.
  - Verified in browser with full movement, jumping, collision, and camera functionality at 60 FPS without errors.

- **Stage 2: Chapter 1, The Sun** completed:
  - Built chapter game-state management system (`src/game.js`) managing `intro`, `playing`, `cutscene`, and `chapterEnd` states.
  - Implemented dialogue and cutscene typewriter system (`src/ui/dialogue.js`) with continue prompts, cinematic camera cues, white screen lightning flash, and screen shake.
  - Built Chapter 1 level (`src/levels/chapter1.js`) with starting village (white architecture + teal domes), ascending terracotta cliff platforms, narrow bridges, and jumping pillars.
  - Implemented dynamic scalable celestial sun with layered warm halos that enlarges as child Hanuman ascends toward the summit.
  - Added 7 collectible low-poly mangoes along the path with animated floating/spinning and HUD counter tracking.
  - Added mid-climb checkpoint at the mountain ridge with automatic respawn on falling.
  - Implemented intro cutscene: sunrise framing the sun with dialogue of child Hanuman's hunger, smoothly panning down to child Hanuman in the village.
  - Tuned child Hanuman character with smaller proportions and agile high jumps.
  - Implemented summit climax cutscene: dialogue, dramatic leap toward the sun, sun expanding to fill the view, Indra's lightning strike (flash + shake), falling hero cutscene, narrator sequence, and Chapter 1 Complete end card with restart button.
  - Stored all story dialogues and scripts in `src/data/story.js`.
  - Verified in browser with full cutscene, climbing, collectible, checkpoint, and summit gameplay at 60 FPS without errors.

- **Hanuman Character Model & Procedural Animation** completed:
  - Built modular primitive-based Hanuman model (`src/characters/hanuman.js`) using cel-shading and inverted-hull dark-warm outlines.
  - Divided body into separate animatable hierarchical groups: head, torso, upper arms, forearms, hands, thighs, shins, feet, and multi-segment curved tail.
  - Implemented design specifications: golden-orange fur (`#E8833A`), lighter muzzle and cheeks (`#F7DCAC`), large expressive eyes, pointed vanara ears, saffron dhoti with red sash, gold necklace, armlets, bracelets, and crown.
  - Exported `makeHanuman({ isAdult, sunDirection })` supporting both Child Hanuman (large expressive head, shorter limbs, no armour) and Adult Hanuman (broader chest and shoulders, athletic warrior silhouette).
  - Added toggleable golden Gada (mace) prop attached to right hand (hidden by default on child, shown on adult).
  - Updated camera rotation to respond directly to mouse movement instead of requiring mouse drag (`src/input.js`).
  - Created procedural animation engine (`src/characters/hanumanAnim.js`): idle chest breathing and multi-segment S-curve tail sway, running arm/leg swings with knee bending and trailing tail, jump pose with arms raised and tucked knees, falling limb balance, and landing squash absorption.
  - Replaced player placeholder capsule in `src/player.js` with `makeHanuman`, keeping physics collider size and movement logic identical.
  - Added debug hotkey `KeyK` to toggle preview between Child Hanuman and Adult Hanuman.

## Next Steps
Ready for Stage 3: Chapter 2, Growing Up.
