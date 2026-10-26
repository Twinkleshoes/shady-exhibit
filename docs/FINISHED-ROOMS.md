# Sculpture, History and Atrium visual finish

The square floor plan, circulation loop, doorway widths, lamps, treasure coordinates, capture/release positions, switches and escape zone are preserved. Gem Gallery remains the reference and retains its refined cases.

## Rendering and shared geometry

`src/game/finished-rooms.ts` renders the new single-surface matte floors, terracotta Sculpture panels, sage History panels, wood artifact cabinets, pottery, historical line illustrations, beveled stone plinths, bust/obelisk/orb exhibits, bronze sun and imperial seal. The atrium includes a slatted reception desk, wood benches with end planters, a framed living-wall divider, low interlocking bronze sculpture, coffered daylight feature and mounted directional plaques. No external artwork, texture downloads or AI services are needed.

`scene3d.ts` dispatches shared furnishing IDs to the renderer and keeps camera raycast proxies at their authoritative positions and dimensions. All opaque furnishing footprints remain inside existing solid footprints. `world.ts` defines the additional upper sculpture/plant/bench-back bounds. History cabinets now have a low full-footprint solid base and separate opaque wood backs/sides; glass fronts and tops are visual only. Movement/navigation/shadow obstruction retain the original blocked floor footprint, while guard visibility uses the actual base and wood-frame heights. Glass never closes a shadow puzzle.

Contact shading from `contact-shadow.ts` grounds visitors, lamps, cases, benches and furniture. It creates no extra reaching shadow and does not darken exposure. Character meshes and gait remain unchanged. Previously floating room/objective signs are replaced by mounted plaques; jammers use the existing nearby contextual hint pattern in all galleries. The main interface has not been redesigned.

## Running and combining the ZIPs

Extract both source and assets ZIPs into the same parent directory, merging their `shady-exhibit` folders. Run `PLAY-WINDOWS.cmd` in that merged folder. Source contains package.json, package-lock.json, TypeScript source, backend, test scripts and documentation. Assets contains the built `dist` directory. Node.js 22.12 or newer is required; Node.js 24 is recommended. Initial `npm ci` needs internet access. Do not copy an older dist folder over the new assets. See README.md for local/LAN and persistent Node server setup.

## Verification

TypeScript, production build and 42 existing checks passed, including seven doorway clearances, a full outer circulation loop, all shadow puzzle solutions, camera pan coverage, visibility/inspection rules, replay reset and nine NPCs navigating for three simulated minutes without crossing solids. A comparison with the checkpoint confirmed every new solid footprint remains contained within a pre-existing wall or furnishing.

A four-independent-browser normal gameplay run completed all three WASD/E treasure thefts, guard selection, pan-away cancellation without refund, capture, shadow rescue, disruption, simultaneous escape, both wins and guard rotation/replay reset. Final decorative adjustments (central sculpture silhouette, non-overlapping headers/coffers and beveled plinths) were followed by a dedicated room-view and camera inspection run.

Limitations: all testing was localhost on Linux with software WebGL. Public deployment, actual LAN/Internet latency, Windows launcher execution and hardware GPU flicker/performance remain unverified. Collision/inspection use designated box volumes, rather than per-triangle sculpture silhouettes. No public service was deployed.

The final visual run passed four independent browser contexts, normal third-person traversal/photos of all updated rooms, all six feeds at center and both ±50-degree limits (18 reviewed views), and an actual selected History Gallery visitor inspection completed to capture. Four separate Socket.IO integration scenarios also passed: lobby/leave/host transfer/room isolation/restart, full online heist, synchronized pan/LIVE/privacy, and actual traversal of every doorway and the circulation loop. Final composition screenshots were retaken from normal gameplay without changing game state or NPC positions.
