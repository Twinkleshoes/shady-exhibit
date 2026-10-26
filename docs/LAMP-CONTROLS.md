# Lamp carrying and puzzle setup

This pass preserves the museum, characters, puzzle calculations, roles and round rules.

## Controls

Approach an unclaimed lamp with a clear grab path. The nearby prompt reads **Space: Grab lamp**. Space claims exactly one object; another press safely releases it. Nearby lamps take priority over movable displays. Capture, leaving, disconnecting, returning to the lobby and replay clear ownership.

A claimed lamp moves toward a point 44 map units (2.2 world metres) ahead of the character's movement heading. Grabbing initially faces the character toward the lamp. Camera orbit is independent. The authoritative 20 Hz server limits carry travel to 180 units/second and sweeps the lamp's 14-unit collision footprint in steps no larger than three units. Walls, railings, displays, cover and other lamps stop it. A straight tether crossing an obstacle or a separation over 100 units causes a safe drop at the last valid position, rather than pulling it through a wall.

A green floor ring appears only for the holder. It turns amber alongside **Blocked · turn or back up** when the target carry position is obstructed. The guard receives lamp positions, without ownership IDs, carry highlights, blocked cues or automatic role alerts. The visible moving lamp remains a clue to interpret.

## Reset placement and generous example solutions

| Puzzle | Reset lamp | Example placed lamp | Example stealing body position |
| --- | --- | --- | --- |
| Gem | 1100, 380 | 460, 200 | 590, 200 |
| Sculpture | 200, 1300 | 200, 1050 | 200, 880 |
| History | 1300, 380 | 1050, 850 | 1160, 850 |

Coordinates are shared map units. These arrangements are examples, not mandatory exact spots. Automated server movement carries every reset lamp into its example arrangement, then verifies all nine body positions offset by ±10 units on both axes and completes a real uninterrupted three-second theft. Existing cover gives teammates opportunities to help and distract. No architecture or puzzle rule was changed to make the new placements work.

The no-ready-solution check is stronger than a floor grid sample: the farthest possible hand from a selected lamp is `320 + 45 = 365` units, plus the unchanged 54-unit interaction radius. Every reset lamp, including the rescue lamp, is more than **419 units** from every treasure. Therefore no body position can steal with any of the reset lamps, even if every intervening obstacle were removed. Actual walls only reduce reach. Moving a lamp is required.

Gem can be carried west along the open southern gallery floor and then north around the rail enclosure. Sculpture moves north through its open southern approach. History moves through the northeast doorway, south beside the partition, then west below its end. Doorways, cover, rescue and escape geometry are unchanged. The floor-plan SVG shows the new reset positions.

## Reproduction

Use Node.js 24 (minimum 22.12): `npm ci`, `npm run lint`, `npm test`, `npm run build`, then `npm start`. Run `npm run test:integration` against that local server. For browser checks, install Playwright Chromium (`npx playwright install chromium`) and run `npm run test:lamp-browser`; set `TEST_URL` to the running server and optionally `BROWSER_EXECUTABLE` to an installed compatible Chromium binary. Test scripts never expose test-only teleport or role-changing endpoints.

Extract both delivery ZIPs into the **same parent folder**, merging the `shady-exhibit` folders. The source ZIP includes the source, locally baked character meshes, manifests, lockfile, licenses, docs and `PLAY-WINDOWS.cmd`; the assets ZIP includes the matching built browser application. Open `shady-exhibit/PLAY-WINDOWS.cmd` on Windows. Node modules and temporary test output are excluded.

## Verification for this release

- **69 automated checks passed**, including the original physics, CCTV/pan, identity, character/animation, cover, navigation and game-rule checks. Treasure rule fixtures now explicitly position moved lamps; the new lamp tests separately cover reset-to-arrangement movement. All reset-to-treasure pairs pass the global 419-unit impossibility bound. Lamp and body positions each tolerate a full 20-unit-wide area in the tested arrangements (81 combinations per treasure).
- **Eight real Socket.IO scenarios passed** on a local production server using independent connected clients: both wins, three carried-lamp thefts and escape, interrupted theft, rescue, camera disruption, selection/occlusion/inspection cancellation, camera panning/LIVE state, all nine doorways and complete loop, private rescue disguises, loading/disconnect abort, ownership contention, synchronized lamp motion, capture release, disconnect release, host transfer and replay positions. Early harness assumptions about a disconnected host and the last approach heading were corrected, then all eight passed. No teleport endpoint or test-only game-state mutation was used in these network tests.
- **Four independent Chromium browser sessions passed all three reset-lamp puzzles** through actual mouse orbit, WASD, Space and E, with all visitors present and no page errors. The checks verify exact grab/release prompts, holder-only rendered rings, no lamp motion from camera orbit alone, normal carried routes, three-second thefts and rendered reaching-fingertip equality with the server target (within 0.015 world units) for every treasure. Thief and relevant guard views were visually reviewed. Server-only collision/blocked-cue tests are distinguished from these browser controls checks.
- TypeScript and the production build passed. The existing large-client-bundle build warning remains. The delivery archives are CRC-tested and byte-compared with the current source/build, then combined by extraction to verify required files.

All execution was on **localhost, Linux and software WebGL**. Windows launcher execution, clean installation on another machine, public hosting, remote latency and native-GPU performance were not tested. Historical visual scripts which assume a ready-made starting lamp solution are superseded for treasure checks by `test:lamp-browser`; the underlying game rules remain unchanged.
