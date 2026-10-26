# Museum material and exhibit pass

The square footprint, doors, room connections, character models/animations and game rules are preserved. `shady-before-materials.zip` is the recoverable checkpoint made before editing.

## Implementation

- `museum-materials.ts` shares warm plaster, pale limestone, cooler stone, oak, dark wood, brushed brass, bronze and restrained glass. Quiet procedural maps and a small static reflection cube are generated locally; no remote textures are required.
- Floors use 1.2 m limestone tiles with slight tonal variation and the existing narrow perimeter borders. Each room has one floor surface; gallery finishing no longer draws a second coplanar floor.
- `daylight-roof.ts` builds ceiling bands around actual openings with recessed plaster reveals, stone frames, zinc mullions and upper sky-colored glazing. Roof geometry is batched by material and participates in third-person camera collision. There is no solid ceiling panel behind an opening.
- Daylight is balanced against warmer wall/floor colors. Three restrained focused lights emphasize the treasures. Ambient contact decals ground visitors, cases, furniture and wall junctions without generating extra interactive shadows. No expensive shadow-map or full-screen ambient-occlusion pass was added.
- The atrium sculpture, sculpture-study and three Sculpture Gallery landmarks have smaller proportionate bases. Their shared world footprints/heights are used by server movement, shadow obstruction, NPC routes and CCTV visibility. Existing treasure bases and every treasure/lamp/switch target remain in place. The tall movable sculpture display retains its intentional cover dimensions and gains a bronze relief.
- Prominent bases have beveled bodies and an inset top deck, avoiding stacked coplanar trim. The bronze study is grounded precisely from its geometry bounds. History cabinets gain small related vessels/tablets within their existing footprint.
- Glass keeps separated transparent panels, clean frames, low opacity and restrained direct cube reflections. Glass uses a lightweight specular material; brass/bronze retain rough standard materials without a runtime reflection-prefilter pass. It does not become a new server shadow blocker. Puzzle timing, reach and obstruction rules are unchanged.

The smooth visitor rig, baked meshes, appearance pool, animation controller, physics/engine/server, lockfile and Windows launcher were byte-compared with the checkpoint and remain unchanged. Contact shading and shared exhibit world data are intentional changes.

## Run and reproduce

Extract both ZIPs into the same new parent folder, merging `shady-exhibit`. Do not nest one ZIP's folder inside the other. Run `PLAY-WINDOWS.cmd` with Node 22.12+ installed, or run `npm ci` and `npm run dev` from the folder containing `package.json`. Installation needs internet initially. The assets ZIP provides the prebuilt `dist` client; the source ZIP includes editable source, manifests/lockfile, local character geometry, licences and launcher.

`npm run lint`, `npm test`, `npm run build`, `npm run test:integration` and `npm run map` are the existing checks. For browser tests start the server, then run `npm run test:browser` with `TEST_URL` pointing to it. `npm run test:materials-browser` captures normal third-person room photographs and CCTV feeds. Use `SCREENSHOTS_ONLY=1` for the room tour, `DETAILS_ONLY=1` for the study/introduction/entrance bays, or `FEEDS_ONLY=1` for a fresh-round six-feed/inspection sweep; separate rounds keep the real six-minute timer intact. Set `BROWSER_EXECUTABLE` for an existing Chromium binary, or install Playwright Chromium separately. Test artifacts are intentionally excluded from delivery ZIPs.

## Verification

TypeScript, production build and all 54 automated checks pass on the final material implementation. The build retains a nonfatal large-client-bundle warning. The existing four Socket.IO integration scenarios passed with the resized shared world geometry: carrying lamps/displays, nine doorways and the circulation loop, all three thefts, capture/rescue, disruption, escape, both outcomes, replay, host transfer/leaving and room isolation. Navigation tests include three simulated minutes of NPC movement, cross-room destinations and obstacle avoidance. Camera tests sample full pan coverage and solid obstruction.

Four independent Chromium contexts on the local production server completed the final third-person room tour and a separate six-feed sweep. Actual room screenshots and moving orbit samples were inspected. Every feed was inspected at center and both pan limits. The History feed selected and completed a real inspection. The tour and feed test recorded no JavaScript page errors; each thief client retained all twelve visitor models. The tour and sweep are separate rounds so the real six-minute timer is not extended or disabled.

Software-WebGL samples across those runs ranged from approximately 1.05 to 4.62 FPS with four simultaneous views, 357–546 draw calls and about 100k–212k submitted triangles per sampled thief frame. These views contain all twelve model instances, with normal frustum culling; they do not place every model in one camera view. Performance is poor in this software-rendered environment. This is not a native-GPU or public-hosting benchmark.

The final uninterrupted four-browser heist run passed physical LIVE state synchronization, UI suspect selection, pan-away inspection cancellation without refund, completed capture, normal WASD/E shadow rescue, all three treasure puzzles, camera disruption, simultaneous escape, both victories, role rotation and replay/reset. A separate fresh-round normal-control tour traversed and photographed the Sculpture Study Bay, History Introduction Bay and south entrance/reception; these views were inspected too. The holding interior and rescue were exercised in the heist test. The guard has only the six mounted feeds; enclosed holding and parts of the transition bays intentionally have no direct guard view.

The two delivery ZIPs were CRC-checked, merged into a fresh extraction and byte-compared with the source, manifests, lockfile, local mesh data, launcher and prebuilt client. The merged extraction passed TypeScript and production build using a temporary link to the already installed dependencies. A clean internet package installation was not tested. Dependencies and temporary test captures/logs are excluded from the archives.

All checks are localhost Linux tests. Public deployment, real LAN/high-latency behavior, Windows launcher execution and native GPU performance/flicker are untested. Browser screenshots were captured at reduced pixel ratios in software WebGL; thin frame edges show sampling aliasing. Finite sampled routes/angles are not proof for every player-moved arrangement. Collision and occlusion retain the game's designated solid box volumes, rather than exact per-triangle sculpture silhouettes. No puzzle rule was changed.
