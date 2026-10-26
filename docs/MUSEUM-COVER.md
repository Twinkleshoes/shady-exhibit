# Intentional museum cover

The previous identity-protection release is preserved in `shady-before-cover.zip`. The square layout, daylight finish, smooth visitors, shared appearance pool, rescue disguises, separated starts, loading barrier and game rules remain.

## Three placed exhibits

| Exhibit | Placement and purpose |
| --- | --- |
| Light & Mineral interpretation partition | A navy/brass panel on the Gem Gallery's eastern approach. It gives a short camera break beside the protected exhibit, with open routes around both ends. The lamp/treasure floor to the west remains open. |
| Folded Strata stone sculpture | Three contiguous stepped stone blades on a compact low base along the Sculpture Gallery route. It creates a landmark and localized cover from the northern lens, with routes on both sides. The southern treasure/lamp approach remains clear. |
| Travel & Exchange cabinet | A tall oak artifact cabinet near History's northeastern approach. Its solid back/end panels provide cover while its front and roof are glass. Existing western and southern routes remain open, and another camera can still observe the treasure approach. |

Only these three pieces were added. The atrium, camera mounts, pan limits, doors, treasure/lamp/switch coordinates, holding room and escape zone were not relocated. Three exhibit-viewing destinations point NPCs at the actual new panel, sculpture and cabinet.

## Consistent cover and visibility

`COVER_EXHIBITS` and `coverWalls()` in `world.ts` define the nine opaque sub-volumes. `museum-cover.ts` renders those exact boxes and returns the visible meshes themselves as selection/third-person camera occluders. Server movement, NPC navigation, shadow obstruction and CCTV use the same definitions. There is no invisible full-height box around the glass cabinet. Glass and small ornamental details are not designated solid blockers. Shared museum materials and contact shading are reused.

Visitor visibility now samples the head, torso, lower body and two shoulder points. Partial exposure above or beside an exhibit remains observable. This is separate from the existing single-point treasure/shadow visibility calculation. The same visitor result drives the current-feed roster, inspection eligibility and continuous inspection cancellation. A fully concealed visitor leaves the roster/rendered suspect collection; the guard's existing stale selection cleanup clears their selection. Stale inspection requests are rejected without spending another charge. Losing visibility during an active inspection spends the original charge and cancels without refund. Panning changes the actual lens frustum; it never moves the mount or sees around a solid obstacle.

## Verification

63 automated checks pass with TypeScript and production build. The existing nonfatal client bundle-size warning remains. Added checks verify exact rendered solid bounds and transparent-panel exclusion; 10,908 comparisons between the server visitor visibility result and mesh-ray/frustum checks across all six cameras, both normal and maximum permitted aspect ratios and every degree from -50 to +50; inspection cancellation, roster removal and stale request rejection behind each piece; partial head exposure; carried-object bypass routes; and an observation angle for every treasure.

Existing checks still cover all nine doorways, the complete alternate circulation loop, two treasure approaches, lamp/treasure/switch/spawn destinations, actual shadow solutions, rescue/escape and three simulated minutes of NPC navigation without obstacle penetration. New bypass routes were checked for visitor radius 18, lamp radius 14 and the carried-display bounding radius of about 32 map pixels. No shadow reach, theft timing or puzzle rule was changed to accommodate decoration.

All seven real Socket.IO integration scenarios passed before the interruption: room management/capture/replay/isolation; full three-treasure heist with carrying, rescue, disruption and escape; panning/LIVE/cancellation/reset; every doorway and loop; repeated rescue disguise changes; delayed readiness/loading disconnect; and the new three-cover inspection/roster regression. The temporary network logs were lost when the runtime ended; their successful results were observed before the interruption.

The four-browser cover regression passed actual panned body selection, normal movement into each cover, cancellation without refund, disappearance from the current roster and rendered suspect collection, rejection of a stale projected body click, and reappearance on stepping out. The test pans toward the subject to keep the projected body clear of the existing floor-map overlay. There were no JavaScript page errors. All six actual feeds were captured at center and both pan limits while held controls swept the range, in separate fresh rounds. All eighteen saved views were visually reviewed after the interruption. The Gem, Sculpture and History pieces were also inspected from normal thief views. Orbiting close to the existing movable display beside the new sculpture invokes the normal camera pull-in behavior; no free camera movement was added.

After restoring the temporary browser, the resumed four-browser puzzle run passed all three treasures with normal WASD/E input and then brought every free thief into escape simultaneously for a thieves victory. This final verdict was retained in the workspace. The cover/inspection and camera-sweep rounds are separate from this heist, keeping the real six-minute timer intact.

Both split ZIPs were CRC-checked, merged into a fresh directory and byte-compared with current source/configuration and built client files. The merged extraction passed TypeScript and production build using the already installed dependencies; a clean internet dependency installation was not tested. Character/appearance/animation files, puzzle physics, speeds, disguise allocation, existing room materials, server routing, launcher and lockfile were also byte-compared unchanged against the checkpoint.

The cover additions use designated opaque box volumes; partial visibility uses five body samples, not exhaustive per-triangle character visibility. One-degree camera and finite navigation samples are not a mathematical proof for every possible player-moved arrangement. All execution was localhost on Linux/software WebGL. Public hosting, real LAN/high-latency play, Windows launcher execution and hardware GPU performance remain untested.

## Run and reproduce

Extract both source/assets ZIPs into the same new parent folder, merge their `shady-exhibit` directories and run `PLAY-WINDOWS.cmd` with Node 22.12+ installed. Or run `npm ci` then `npm run dev`. Update both archives together and refresh old browser tabs. The source includes manifests/lockfile, local character mesh data, licences and launcher; assets contains the matching prebuilt client. Dependencies and temporary captures/logs are excluded.

`npm test`, `npm run lint`, `npm run build`, `npm run map` and `npm run test:integration` exercise the shared definitions. `npm run test:cover-browser` uses four independent browser contexts and a running server at TEST_URL. Set BROWSER_EXECUTABLE if needed. Default mode checks the three cover walks and inspections; SWEEP_GROUP=1 or 2 checks three mounted feeds per fresh round; PUZZLES_ONLY=1 solves the three treasures with normal WASD/E and attempts simultaneous escape. These modes preserve the real six-minute timer.
