# Main menu and multiplayer lobby — presentation checkpoint

This stage continues the Guided Tour checkpoint. The museum, characters, authoritative engine and gameplay rules are unchanged. `shady-before-menu.tar.gz` contains the pre-change project, including the completed Guided Tour source and matching built application. `shady-menu-lobby-checkpoint.tar.gz` contains the changed source files and required new local images, to overlay onto that project; run `npm run build` after restoring the overlay. This is a recovery checkpoint, not the final source/assets ZIP delivery.

## Implemented

- Navy, cream and brass presentation with a custom reaching-shadow title motif, restrained translucent controls, labelled name/code fields, busy/connection/error feedback, How to Play and Settings.
- Admission-pass player cards with host identification and four explicit slots, a prominent selectable room code, real clipboard confirmation, honest manual-copy fallback, host-only Start with the four-player reason, private roles and visible Leave Lobby.
- The existing museum scene and visitor rigs provide a real daylight atrium background. Menu and lobby use different camera presets. Two ambient visitors follow local visual choreography, with no Socket.IO connection, authoritative game state, physics loop or game-rule simulation in the backdrop.
- Exactly one background renderer and animation loop are shared across menu/lobby transitions. Rendering is capped at 24 fps and pixel ratio 1. Hidden tabs pause; reduced motion renders a still 3D view with no animation loop. Starting gameplay, selecting the still image, unmounting or losing WebGL disposes the scene, characters, textures, renderer and context.
- Separate optimized still images of the actual atrium serve menu and lobby when 3D is unavailable or deselected. They are rendered from the project's own scene and assets, not external art. Both are bundled in `public/` and copied to `dist/` by Vite. The pair totals about 114 KB.
- Sound, background quality and reduced-motion settings persist locally. OS reduced motion is respected by default. Settings uses a native focus-trapped dialog; How to Play now traps focus, handles Escape and restores focus. Buttons/fields have visible keyboard focus states.
- Existing browser scripts' exact Join button selectors were updated to the visible **Join Room** label; their broader gameplay scenarios were not rerun in this stage.

## Actually verified

`npm run lint` and `npm run build` pass. The existing large-bundle advisory remains; no new dependencies or lockfile edits were introduced.

`npm run test:menu-browser` passed against a local production server in Chromium, including four independent browser contexts:

- Missing display name validation/focus and a real room-not-found response, with useful feedback and working retry controls.
- Main-menu bounds at 1440×900, 1366×768, 1280×720, 1024×768 and 1024×600; lobby bounds at laptop sizes including 1024×600. No clipped controls or unnecessary page scroll in the tested normal states. Errors, settings, empty/full lobbies, host and guest states were captured and visually reviewed.
- Actual clipboard copy/readback, three complete create/leave cycles, empty slots, player count and the disabled-Start explanation.
- Settings focus containment, keyboard focus indication, How to Play keyboard closure, Escape/focus restoration, reduced-motion loop stopping and switching between 3D/still backgrounds.
- Four connected players, host-only Start, host transfer after leaving, rejoining the same room, actual match start/scene readiness, removal of the menu renderer/loop during gameplay, and confirmed game leave restoring the main menu while remaining players return to their lobby.
- OS reduced motion and forced unavailable WebGL, with working menu/lobby controls and no page errors.

`npm run test:menu-edge` additionally passed: actual WebGL context loss and disposal, usable static lobby, rejected clipboard writes selecting the correct code without false success, both fallback image URLs, and sound/graphics/motion preferences surviving reload.

Internal renderer metrics confirmed one renderer/loop in animated menu/lobby, zero loops in reduced motion, zero renderers/loops in static mode or after context loss, and zero menu renderers/loops during active gameplay. Repeated menu/lobby entry reuses the same renderer rather than accumulating instances.

These are localhost Linux tests using software WebGL. Native GPU performance, Windows execution, Safari/Firefox, public hosting/remote latency, the broader gameplay/regression suite, and final source/assets archive delivery remain for the next step. No claim of full gameplay regression coverage is made here.

## Next packaging step

Do not use the older packaging filter that omits every WebP/image. The final source/assets delivery must retain **public/menu-atrium.webp** and **public/menu-atrium-lobby.webp**, plus the matching **dist/menu-atrium.webp** and **dist/menu-atrium-lobby.webp**, along with the usual manifests, lockfile, local character assets, built JS/CSS and `PLAY-WINDOWS.cmd`. The previous release ZIPs have intentionally not been replaced in this stage.

To reproduce, run the production server (`npm run build`, `npm start`) and use `npm run test:menu-browser` and `npm run test:menu-edge` with an installed Playwright Chromium. `BROWSER_EXECUTABLE` can point to another compatible Chromium binary; `TEST_URL` defaults to localhost port 3000.
