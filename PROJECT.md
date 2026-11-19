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
- [ ] Stage 1: Core movement (run, jump, camera, collisions)
- [ ] Stage 2: Chapter 1, The Sun
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

## Next Steps
Ready for Stage 1: Core movement (run, jump, camera, collisions).
