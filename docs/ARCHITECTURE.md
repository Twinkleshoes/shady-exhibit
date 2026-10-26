# Architecture and arrangement pass

This builds on the decorated square museum and the completed original low-poly visitor upgrade. The building footprint remains 1400 × 1400 map units. All movement is on one floor. Twelve role-independent visitor appearances and their fifteen-bone walking/admire rig remain unchanged.

## Design and map changes

- Gem Gallery: reduced from the whole northern wing to an 800 × 460 central salon. The Royal Sapphire is the central protected exhibit at (700,200), with lamp at (480,200). Mineral cases and short recessed display returns occupy its perimeter. Two new 140-unit openings connect northern study/introduction bays to Gem.
- Sculpture: the largest combined gallery area, with a northern bronze-knot study landmark. The obelisk moves to (340,960), offset from the bust and terracotta orb; its movable study display moves to (310,780). Two routes weave around the plinth groups rather than narrow gaps between repeated blocks.
- History: an introduction cabinet and a short partition define the northern Origins bay. The Seal's case moves inward to (1210,850), retaining routes on both sides and the existing gameplay lamp. The east northern doorway moves to x=1230, preserving full carried-display clearance beside the Gem dividing wall.
- Atrium: enclosed 8.2m high hall, taller bronze Confluence sculpture, skylight well, cream pilasters, clerestory and framed gallery portals. Reception moves beside the entrance at (620,1230); seating and planting flank the central circulation. Gem's ceiling is 4.8m, Sculpture's 5.6m and History's 4.65m.
- Connections: nine generous doorways, shallow arch relief, mounted signs and subtle floor borders. The original north/south loop and atrium routes remain. Holding, rescue, escape and jammer locations remain accessible.
- Camera 01 moves to the east atrium wall at visitor-readable height, looking diagonally across the hall beside the taller sculpture. Camera 02 centers on the relocated Sapphire. The escape privacy screen is taller so no camera watches rescue and escape simultaneously. Pan remains ±50°, per-feed saved and reset each round.

## Shared geometry

`world.ts` owns room bounds/heights, nine doorways, all floor-standing obstacle boxes, exhibits, lamps, treasures, spawns and reset data. Both server and client import these definitions. The visible detailed models stay within those declared furnishing footprints; server obstruction remains simplified boxes, not per-triangle artwork. Glass is transparent visual dressing above the solid bases and does not add unintended shadow barriers.

`architecture.ts` batches fixed architectural ornament into six material groups. It adds no floor-standing unregistered barriers. Overhead portals/arches have matching client camera raycast meshes. Small borders and wall relief are decorative. `finished-rooms.ts`, `gem-gallery.ts` and `scene3d.ts` render the shared arrangements and ceiling transitions. Navigation destinations are paired with named, actual exhibits or seating, and the admire system uses those look-at points. The in-game maps and the overview SVG consume the same map definitions.

The shadow rules, actual interactive fingertip, walking speed, character rig, original materials and shared animation source were compared byte-for-byte against the checkpoint. The Windows launcher and dependency lockfile are preserved. No new runtime dependencies, remote assets or API keys are required.

## Run and reproduce

Extract the source and assets ZIPs into the same fresh parent directory, merging their `shady-exhibit` folders. In that folder run `PLAY-WINDOWS.cmd`, or use Node 22.12+ with `npm ci` then `npm run dev`. For a production build use `npm run build` then `npm start`. Installation requires npm access. Exactly four humans join the same server; no bots fill human slots.

Checks: `npm run lint`, `npm test`, `npm run build`. With the server running: `npm run test:integration`, `npm run test:rooms-browser`, `npm run test:architecture-browser`, `FEEDS_ONLY=1 npm run test:architecture-browser` (a fresh round for all camera angles), and `npm run test:browser`. Browser tests accept `TEST_URL` and `BROWSER_EXECUTABLE`. `npm run map` regenerates `docs/museum-floor-plan.svg`.

## Verification

Current results are recorded in the delivery summary. Tests are local-server tests. Navigation and visibility tests use finite path/angle samples, not a proof for every possible arrangement of player-moved objects. Screenshots are actual Chromium gameplay, not generated illustrations. Four software-rendered views are slow in this environment; native-GPU performance and visual quality, public hosting, real LAN/high-latency play and Windows launcher execution are unverified. The Linux Node server, browser clients, source build and packaged files are exercised directly.

### Completed checks on this release

TypeScript, the production build and **52 automated checks** pass. The production build has the existing nonfatal large-bundle warning. All four real Socket.IO integration scenarios pass on the shipped map/camera definitions, including the full nine-doorway loop, multiplayer privacy, carrying, rescue, three thefts, disruption, escape, both outcomes, leaving/host transfer, room isolation and replay reset/role rotation.

The final four-browser heist passes real UI selection, pan-away cancellation without refund, capture/rescue, three normal WASD/E thefts, disruption, simultaneous escape, both wins and full replay reset. The visual tour captured normal thief views in all updated spaces, plus physical LIVE and neutral states; all three thief clients received the same active feed. Actual following-camera diagnostics passed **29 orbit samples**, including six camera retractions and a high orbit under Gem's lower ceiling, with no sampled camera point inside the shared solid obstacles.

The long combined visual tour reached the normal six-minute timer at its last pan. The visual tests are now split into room/orbit and fresh-round feed modes; the game timer was preserved. The completed fresh-round sweep checked **all six cameras at center and both ±50° limits**, with actual rendered-body click selection and completed inspections in cameras 01 and 06. Every thief client retained all twelve fifteen-bone visitor models; the guard's rendered visitors had no private teammate markers. Samples with four simultaneous software-WebGL views were approximately **4.2–5.5 FPS**, with 318–458 draw calls in the sampled thief views. This is a slow software-rendering test, not a native GPU benchmark.

All 18 feed images and the normal thief photographs were visually inspected. The map overview is a separate diagram generated from the shared map definitions. The source and assets ZIPs are CRC-checked, extracted together, and the extracted source is checked and rebuilt using the installed dependencies. Windows execution, public hosting, real LAN/high-latency networking and hardware-GPU performance remain untested.
