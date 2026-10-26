# Smooth museum visitor refinement

A recoverable source/build checkpoint was saved before editing. This stage changes the character surfaces and rig weights, not the museum or gameplay rules.

## Geometry and rig

The former rigid cylinders, joint balls, box torso and assembled hair pieces have been replaced by a continuous organic body surface. It includes a gently tapered chest/waist, rounded shoulder attachments, a blended neck/head, integrated ears/nose, shaped forearms/wrists, thumbed hands, and connected thighs/knees/calves. Arms attach at the shoulders, with an actual gap beside the hips and armpits; this avoids accidental geometry bridges that stretch during animation. Pelvis weights blend across both thighs instead of snapping at the center seam.

Clothing styles share the anatomical mesh and use bind-space material boundaries for clean cuffs, collars, waistbands and jacket lining. The A-line skirt is a separate continuous shell with controlled thigh influence; backpacks and footwear have rounded geometry with intentional edges. Four cohesive hair surfaces follow the head bone. The ponytail is joined into its scalp surface, rather than hanging from separate hair blocks.

The mesh uses smooth vertex normals and a single skinned material batch. Shoulder, elbow, wrist, hip, knee and ankle weights blend across neighboring bones. The fifteen named bones, shared walk/idle/turn/admire controller and its timing remain. Arm bind positions were adjusted slightly outward to match the new surface and prevent resting sleeves from touching the hips.

The editable surfaces are original project geometry. `visitor-surface.ts` contains the signed-distance surface authoring algorithm. `scripts/bake-visitors.mjs` uses Three.js's MIT-licensed meshoptimizer-based SimplifyModifier offline to reduce the body/hair meshes while retaining curved silhouettes. The resulting local `src/game/assets/visitor-surfaces.json` is bundled into the client. Model construction is synchronous; no network model fetch or WebAssembly initialization runs during gameplay. Source geometry is cached per body/hair variant and each model owns its disposable skinned mesh/material/skeleton.

The optimized representative models use approximately 7,200–8,030 indexed vertices and 13,372–14,816 triangles, each with one character material batch. Small badges/contact shadows are separate as before. The appearance pool, model factory and animation system are identical for NPCs and players; roles never choose clothing. No external character model or animation pack was downloaded. Three.js and meshoptimizer notices are in `docs/licenses`.

## Preserved behavior

Museum definitions, camera placement and panning, collision/shadow physics, speed settings, appearance assignment, shared animation controller, authoritative engine, Socket.IO server, interactive shadow renderer, Windows launcher and package lock were compared byte-for-byte against the checkpoint and retained. Appearance IDs stay synchronized and stable within rounds. The interactive shadow's visible hand is still driven by the server's endpoint. Its geometry/radius rules were not changed.

## Reproduce

Extract both delivery ZIPs into the same new parent folder, merging the `shady-exhibit` directories. Run `PLAY-WINDOWS.cmd` with Node 22.12+ (24 recommended), or `npm ci` then `npm run dev`. Installation needs npm access. Production: `npm run build` then `npm start`.

`npm run bake:visitors` regenerates the local optimized surfaces after authoring changes. Rebuild the client afterward. `npm run test:smooth-preview` renders front/side/back pose sheets and a twelve-model stress fixture. Browser tools accept `BROWSER_EXECUTABLE`; use `npx playwright install chromium` if needed. The live multiplayer character regression is `npm run test:characters-browser` with a running server and optional `TEST_URL`.

## Verification and limits

54 automated checks pass, including continuous body/hair topology, normalized blended skin weights, valid smooth normals, vertex/triangle budgets, finite deformed vertices and rejection of stretched joint/hip edges in walk/admire bends. TypeScript and production build pass; the build retains a nonfatal large-bundle warning. All four existing Socket.IO integration scenarios pass, including carrying, all three treasures, rescue, disruption, escape, captures, both outcomes, leaving/host transfer, room isolation, all nine doorways, role rotation and reset.

The final four-browser character run passed all twelve models on each thief client, synchronized appearances/actions, actual F-to-admire, walking cancellation, bent knees/grounded feet, body hover/click selection, guard marker privacy, three captures, guard victory, replay and normal shadow theft. The actual rendered fingertip matched the server hand within 0.015 world units. An initial guard-test position was legitimately hidden behind the atrium sculpture; the regression now moves to a visible location before attempting selection.

Front, side and back render sheets were visually inspected for idle, walking, turning and admiring across curly/jacket, bob/skirt, ponytail/backpack and ponytail/skirt combinations. All twelve front appearance designs were inspected. These use the same real rig and controller as the game; their neutral reference background is not a museum gameplay screenshot. Actual thief and CCTV screenshots are supplied separately. No sampled pose showed detached joints or the former arm/hip webbing. These finite samples are not an exhaustive guarantee for every pose or every possible surface intersection. The skirt uses skinning, not cloth simulation, and walking retains the existing stylized in-place gait with possible horizontal foot sliding.

Four simultaneous software-WebGL game views remained slow: final samples were [6, 3.1, 1.2, 3.5, 4, 5, 3.2, 3.6, 3.4, 3.1, 2.8, 2.9] FPS, including warm-up. This is not a hardware-GPU benchmark. Public hosting, real LAN/high-latency play, Windows launcher execution and native GPU performance remain untested. The separate twelve-visible-model render fixture is not a substitute for those multiplayer tests.

The twelve-visible-model stress fixture submitted all twelve skinned meshes together: 170,810 triangles, 37 draw calls and approximately 13.0 FPS in one software-rendered viewport. Its neutral floor and arranged positions are an inspection fixture, not a multiplayer museum screenshot.
