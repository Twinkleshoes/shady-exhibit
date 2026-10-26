# The Shady Exhibit — Atrium Heist (v0.4.0)

A real online museum heist with a default four-player game and optional **Two-Player Duel**. Read **START-HERE.txt** for complete extraction/launch instructions and `docs/TWO-PLAYER-DUEL.md` for both rule sets.

In the original four-player mode: one CCTV guard, three cooperating thieves, nine wandering visitors, three connected 3D galleries, three treasures, movable lamps/displays, rescue, camera disruption and a six-minute escape objective. No API keys or AI service are needed.

## Start on Windows

1. Stop the previous game server with Ctrl+C in its command window.
2. Extract both source and assets ZIPs into the same fresh parent folder. Merge their `shady-exhibit` folders; do not put one inside the other.
3. Open the folder and double-click **PLAY-WINDOWS.cmd**.
4. Let it install packages on the first run. The browser opens when the server is ready. Keep the black window open while playing.

The launcher needs Node.js 22.12 or newer (Node 24 recommended), which you already installed for the previous version. Package installation needs an internet connection the first time. If the port is already in use, close the old game server and try again.

Alternatively, open a terminal in the folder containing package.json:

```sh
npm ci
npm run dev
```

Open **http://127.0.0.1:3000**. Create a room, join its four-character code from three other browser sessions, and have the host start. Exactly four humans are required in Four-Player Heist, or exactly two in the host-selected Two-Player Duel. NPCs never fill player slots. Four tabs work for testing because each Socket.IO connection has a distinct identity. Separate profiles/private windows work too.

On one LAN, friends open `http://HOST-LAN-IP:3000`, with the host's inbound TCP port allowed by its firewall. Everyone must connect to the same server. A room code alone does not expose localhost to friends elsewhere on the internet.

## Intentional museum cover

Three new exhibits provide localized camera breaks: a navy mineral interpretation panel, a stepped stone sculpture, and a tall oak artifact cabinet. Their opaque parts share rendering, collision, navigation, shadow and CCTV definitions; glass stays transparent. Partial head/shoulder exposure remains observable, and fully hidden visitors leave the guard roster and cancel inspection without refund. Read `docs/MUSEUM-COVER.md` for placements, current test coverage and limits.

## Thief identity protection

Successful rescues silently replace the captured visitor’s outfit and badge inside holding, then release them into the existing camera-concealed passage. Teammates retain private recognition. The guard loses the retired selection/badge and sees the replacement only on later visible re-entry. Each thief now starts in a different gallery among NPCs, sharing a randomized public spawn pool. All four rendered scenes must be ready before the feed and six-minute clock begin. See `docs/IDENTITY-PROTECTION.md` for behavior, protocol and current test results. Update both ZIPs and refresh old client tabs together.

## Museum materials and exhibit proportions

Warm plaster, human-scale limestone tiles, restrained stone/wood/brass/glass, proportionate beveled sculpture bases, focused exhibit lights, softer contact shading and framed roof openings now finish the existing museum. The layout, puzzles and smooth visitors are preserved. Read `docs/MATERIALS.md` for implementation, extraction and current test results.

## Smooth visitor refinement

Visitors now use a continuous rounded body mesh, smoothly blended shoulder/elbow/knee weights, shaped torsos and wrists, integrated necks, rounded shoes, and cohesive hair surfaces with attached ponytails. The twelve shared role-independent appearances and existing animation controller remain. Local editable mesh data is included in the source ZIP; the assets ZIP contains the complete prebuilt client. Read `docs/SMOOTH-VISITORS.md` for construction, reproduction and test details.

## Architecture and visitor upgrades

The compact mineral salon has a central protected Sapphire and perimeter exhibit bays. The larger Sculpture Gallery includes a bronze study bay and offset landmarks, while History connects its introduction bay to sage-and-wood cabinet displays around the Seal. A taller, enclosed 8.2m atrium, skylight, Confluence sculpture and entrance reception organize the original square footprint. All playable circulation remains on one floor. The latest twelve original skinned visitor appearances, shared walk/admire system and role-independent disguises are retained.

## Live cameras and shared walking speed

Each physical CCTV head has a neutral camera-number plate and unlit LEDs when idle. Only the selected, enabled camera shows bright red LEDs and a red **LIVE** plate. This is synchronized to all three thieves on feed switching; disabled cameras never show LIVE. Heads visibly turn when panned, without moving their mounted position.

The guard pans with **A/D**, **left/right arrows**, or held **Left/Right** buttons. Pan is server-controlled at 35°/second within ±50°. The on-screen angle is authoritative. Each camera remembers its angle until a new round resets all angles to zero; **Center** recenters the selected camera. Changing feeds stops held pan input. Opening menus, releasing a button/key or losing focus also stops it. Disabled cameras cannot pan.

Suspect rosters, click selection, line-of-sight checks and inspections all use that actual panned view. Panning away cancels a scan without refund. Thieves and NPCs now use the same 120-pixel/second base walking speed and shared gait rate, with no sprint. NPCs pause to admire exhibits and turn before resuming a route; a pause is intentionally slower than continuous walking.

## Controls

- **WASD:** camera-relative movement.
- **Click and drag the museum view:** orbit the third-person camera.
- **F:** admire an exhibit using the same animation as NPC visitors. Movement cancels it.
- **Space:** grab/release the nearest unobstructed lamp or movable display within reach. One person can carry an object at a time.
- **Hold E:** hold the shadow hand on a treasure or switch for three uninterrupted seconds. Releasing, changing targets, losing light/contact or being captured resets that thief's progress.
- **Esc:** Resume, Controls, Leave Game. The multiplayer round keeps running; your own inputs release while the menu is open.

Your own marker is blue; teammate markers are purple. The guard never sees those markers or names. The map shows treasures, lamps, switches, displays and the escape zone. The countdown and treasure count are always visible.

## Heist and escape

Explore the **Gem Gallery (north), Sculpture Gallery (west), and History Gallery (east)** around the central atrium. Nine wide doorways and the short south connection create a complete circulation loop: travel between galleries through the north or south routes without returning to the atrium. Reception, benches, the central sculpture and main entrance provide landmarks. Security Holding is southwest of the atrium; escape is southeast.

The Gem Gallery uses display cases and velvet railings. The Sculpture Gallery has offset solid plinths with a southern approach to the Bronze Sun. The History Gallery uses staggered cabinets and partitions around the Imperial Seal. The current floor plan is in `docs/museum-floor-plan.svg`; updated screenshots are delivered separately. See `docs/ARCHITECTURE.md` for this pass and its verification.

Each thief has one interactive shadow from the nearest unobstructed gameplay lamp within 320 pixels. A 30-pixel switching buffer prevents flickering between similarly close lamps. The shadow points away from the light; getting closer lengthens its reach, capped at 175 pixels. Solid walls and displays block both light and the shadow. Ordinary daylight/decorative lighting does not generate additional gameplay shadows.

Move a lamp or display to line up a reachable hand. Each default puzzle is solvable, and movable objects allow alternative setups. Lamps and displays can travel through the wide doors; the same museum walls bound their movement. Only your private contact highlight indicates a valid target; the guard sees the actual reaching silhouette without targeting guides. A theft removes that gem and alerts security to its gallery without naming its thief. Progress is independently tracked for each thief and never combines.

**Stealing one or even all three treasures does not immediately win.** Once all are stolen, every uncaptured thief must stand in the green escape zone in the southeast of the atrium at the same time. At least one thief must be free. You may leave captured teammates behind.

## Capture and rescue

A completed inspection sends a thief to the **Security Holding room on the southwest side of the atrium**. Captured thieves cannot move, interact or be inspected again.

A free thief can hold their shadow on the **lavender release switch outside holding** for three seconds. It releases all currently captured teammates to safe positions outside the cell and alerts the guard. Rescue is available whenever someone is detained. If all three thieves are captured at once, the round ends immediately; there is nobody free to rescue them.

## Camera disruption

Each gallery has an **orange shadow switch** linked to its gallery camera (02, 04 or 06). A completed three-second interaction immediately alerts security, disables that camera for **five seconds**, and starts a **30-second cooldown** on that switch. A disabled feed shows an outage countdown and no suspect roster; security can use another camera. Any inspection on the disabled feed cancels without refund. The HUD lists each switch's readiness/cooldown.

## Guard controls and victory

Six mounted cameras with bounded horizontal pan cover the atrium, gallery connections, and three treasure galleries. Select a feed using its button or the camera map. Click a visible visitor/body/badge or its roster entry, then Inspect.

The guard starts with three charges. A scan consumes one and takes two seconds. Panning a suspect out of view cancels it without refund. The target must remain visible on the same camera throughout. Walls/displays, leaving view, switching cameras or disruption cancel the scan without refund. Each spent charge independently returns after 20 seconds. Inspecting an NPC captures nobody. The guard has no gallery avatar and receives no player names, team markers, targeting guides or body positions outside the live feed. An anonymous visible reaching shadow may still enter the frame while its owner's body remains outside it.

The guard wins when all three thieves are captured simultaneously, or when the six-minute timer expires. A timeout takes priority over an escape on the same simulation step.

## Leaving and restarting

Only the host starts/restarts a round. The guard rotates deliberately between rounds, including when returning to lobby and starting again. Results provide separate Return to Lobby and Main Menu actions. Leaving an active round requires confirmation and aborts it without a winner for remaining players, who return to lobby. Host transfers on departure; empty rooms are deleted. Departed players can join another room immediately. Restarts reset inputs, held objects, light selection, progress, captures, treasures, timer, outages and cooldowns. Rooms remain isolated.

## Production / internet hosting

Use a persistent **Node web service with WebSocket support**. Static-only hosting cannot run this backend. No public deployment is included.

```text
Install: npm ci
Build: npm run build
Start: npm start
Port: PORT environment variable (defaults to 3000)
```

`npm start` serves the built frontend and Socket.IO backend together. The host's HTTPS endpoint must forward both ordinary HTTP and Socket.IO WebSocket upgrades. Share that address with everyone, then share the room code. Do not use `vite preview` as the multiplayer server.

Run **one server instance**: room state lives in memory. A server restart clears rooms. Multiple replicas need shared simulation/state ownership first. Hosting costs/accounts are separate; public internet latency, load, unreliable-network recovery and production scaling are untested.

## Tests

```sh
npm run lint
npm test
npm run build
```

With a server running in another terminal, `npm run test:integration` opens four real Socket.IO clients. It checks lobby/privacy/host lifecycle and guard victory; a full heist including actual traversal, lamp/display carrying, interrupted holds, rescue, disruption, all three thefts and escape; and pan/LIVE synchronization, visibility rejection and replay reset.

For four independent browser contexts:

```sh
npx playwright install chromium
npm run test:browser
npm run test:camera-browser
```

The first browser script completes a full UI-driven heist with WASD, mouse orbit and E, capture/rescue, disruption, simultaneous escape, role rotation, reset and guard victory. The second starts a fresh match and records all six feeds at center and both ±50° limits plus all three thief views. Separating these runs leaves the actual six-minute timer intact. Both record screenshots under `test-artifacts/atrium`; review them to assess rendering. `TEST_URL` selects a running server (default `http://127.0.0.1:3000`); `BROWSER_EXECUTABLE` optionally selects an installed Chromium binary. These variables are not needed to play.

`npm run map` regenerates the SVG floor plan directly from shared map definitions.

## Validation and limitations

See TESTING.md for the completed checks and their scope. This release has local browser and multiplayer testing; it has not been publicly deployed or tested for production load. The Windows launcher is supplied but cannot be executed on this Linux test host; the underlying Node start commands were tested.

Visibility uses deterministic perspective rays against the same designated obstacle boxes used by the scene and movement. Fine limb visibility and decorative sculptures are simplified; glass vitrines transmit light. Shadows use intentionally simplified floor silhouettes, not physically traced daylight. Gameplay switches have no collision volume and are activated by the shadow hand on their floor pad.

## Source

- `server.ts`: Socket.IO rooms, input validation, lifecycle and real-time loop.
- `src/game/engine.ts`: authoritative simulation, capture/rescue, independent holds, thefts, cooldowns, timer and final victory.
- `src/game/world.ts`: gallery layout, shared walls, props, switches, holding and escape zones.
- `src/game/scene3d.ts`: bright museum rendering, shared-size obstacles, lamps, gems and switches.
- `src/game/physics.ts`, `cameras.ts`: shadow/light and visibility calculations.
- `src/game/navigation.ts`, `visitors.ts`: collision-aware routes, shared-speed walking, turns and exhibit pauses.
- `src/components/Thief3DView.tsx`, `Guard3DView.tsx`, `MissionHUD.tsx`: 3D play, CCTV and HUD/map.
- `src/game/engine.test.ts`, `integration.test.ts`, `scripts/browser-check.mjs`: current validation.

Legacy single-gallery rules and reference tests are retained separately for comparison; the running game uses the expanded engine's final victory rules.

## Lamp carrying and reset puzzles

Space now grabs an available nearby lamp and releases it again. Carrying follows character movement rather than camera orbit, with server collision sweeps, exclusive ownership, a private holder highlight and blocked cue. All treasure lamps start beyond any possible ready-made shadow solution and must be repositioned. See [LAMP-CONTROLS.md](docs/LAMP-CONTROLS.md) for controls, example arrangements and verification.

## Public hosting

See [docs/PUBLIC-HOSTING.md](docs/PUBLIC-HOSTING.md) for exact Render settings, account requirements, player instructions, and the public acceptance checklist. Preparation is complete; no public URL has been verified.
