# Atrium layout validation — v0.3.0

All results below are local tests of this implementation. Prior developer reports were not treated as verification. No public deployment was tested.

## Automated physics / engine checks

`npm run lint`, `npm test` and `npm run build` pass. There are **52 unit checks**. The production build emits a nonfatal bundle-size warning.

The retained rules/physics/engine regressions cover individual uninterrupted progress, captures, rescue, all-capture and timeout victories, simultaneous escape, captured teammates left behind, independent recharge timers, disruptions/cooldowns, lamp hysteresis, movable collisions, privacy, pan limits/memory/LIVE state, inspection cancellation without refund, shared walking speed/gait, role rotation and reset. Map-specific fixtures were updated to the actual atrium geometry rather than weakening the visibility assertions.

The shared-map checks cover:

- Every intended doorway in both directions for player, lamp and carried-display clearance (18px, 14px and 32px radii).
- North and south circulation routes while the atrium is explicitly blocked, plus routes from player spawn to every viewing destination.
- Collision-free human/NPC/lamp/switch spawns and viewing destinations.
- Three different body-reachable shadow puzzle solutions in default geometry.
- Nine NPCs over a simulated three minutes: each crosses room boundaries, pauses/turns/walks, and never overlaps a wall. Several visit four or five areas. Routes are rebuilt against actual static and moved geometry when blocked.
- All six cameras sampled at eleven positions across their full ±50° range, with useful unobstructed floor coverage. No sampled feed sees rescue and any of 121 sampled points across the full escape rectangle together, including its corners.
- Object/treasure/switch/timer/capture/pan/input reset and deliberate guard rotation on replay.

## Real Socket.IO sessions

Four independent clients connect to the actual server. All four scenarios passed together on the final map:

1. Four-player lobby, guard-only anonymous visible roster, movement flood protection, scan/feed-change cancellation, all three captures, guard victory, host-only restart, role rotation, disconnect abort, host transfer, immediate joining of a second room and room isolation.
2. Complete heist using normal server input events and collision-aware movement: capture, three-second shadow rescue, recapture, actual lamp and display grab/carry/release, interrupted theft progress, all three treasures, five-second camera disruption with 30-second cooldown, and escape with two captured teammates left behind.
3. Pan/LIVE updates reach all three thieves; thief pan commands are rejected; packet flooding cannot accelerate pan; hidden targets cannot be inspected; panning cancels a scan without refund; pan memory and replay reset work.
4. A human client physically traverses all nine intended doorways, including both southern connections, in the running server. No teleport/debug endpoints were used.

## Browser / visual checks

The browser scripts use four independent Chromium contexts connected to the running server. They use actual mouse, keyboard and UI actions, not an injected local simulation. Browser artifacts are recorded under `test-artifacts/atrium`; selected current deliverable images are attached separately. Current architecture details and limits are in `docs/ARCHITECTURE.md`.

The full browser match passed on the final geometry: third-person mouse orbit and actual WASD travel, all three E-key treasure puzzles, selection from the guard roster, panning away to cancel an inspection without refund, actual capture into holding, shadow-operated teammate release, a gallery camera outage with no LIVE camera across all three thieves, gathering all three free players into escape for thieves' victory, host replay, role rotation and fresh pan/treasure/held-object state, then all three captures for guard victory. No browser page errors occurred.

The separate camera pass tests actual canvas badge selection, held on-screen pan, saved positions when switching feeds, ArrowLeft/D controls to both pan limits, physical camera turning and LIVE/neutral plates from normal third-person orbit. All six cameras passed. Each center and both limits were recorded and visually inspected (18 views); the camera housing never covers the feed. Physical LIVE/neutral plates and turning were inspected from thief views. After increasing map-label sizes, a separate four-context pass rechecked all six center feeds, LIVE/neutral, canvas selection and held pan on the final UI.

The reproducible commands are:

```sh
npx playwright install chromium
npm run test:browser
npm run test:camera-browser
```

`TEST_URL` selects the server (default http://127.0.0.1:3000). `BROWSER_EXECUTABLE` optionally selects an existing Chromium executable. Full-heist screenshots use reduced device pixel density to run four WebGL sessions on the software renderer; the camera sweep uses full pixel density. Browser movement uses validated rectilinear routes, actual WASD and authoritative heading feedback to avoid accumulating mouse-drag rounding in automation.

The floor plan in `docs/museum-floor-plan.svg` is generated from shipped room, wall, door, camera and objective definitions by `npm run map`; its PNG is rendered from that SVG. It is an overview drawing, not a substituted gameplay view.

## Limits

- Localhost testing only. Public internet hosting, real LAN hardware, high latency/packet loss, production load and multiple server replicas remain untested.
- The Windows command wrapper is preserved. This Linux environment cannot execute the Windows shell portion; Node server/build/start paths were exercised. First installation requires npm access.
- Visibility uses shared simplified obstacle boxes and perspective rays. Ornamental sculpture details, small handles and labels are decorative; their collision footprint is the visible supporting plinth. This is not per-triangle limb visibility or photorealistic light transport.
- Walking speed and gait are checked against shared settings and rendered walkers, not a frame-by-frame motion-capture measurement.
- The navigation sweep and coverage sampling are finite tests, not proof against every possible player arrangement of movable objects. Blocked NPCs stop and reroute; players can reposition movable obstructions.


## Current architecture pass

The latest source includes the completed visitor rigs/animation (see `docs/CHARACTERS.md`). New checks verify two body approaches per treasure, useful objective coverage, distinct ceiling heights, valid batched architecture geometry, and rejection/cancellation of inspections behind the new Gem bay wall without refunds. Current-map integration traverses nine doorways. `test:architecture-browser` samples the actual resolved third-person camera near walls, bays and doorways, including a high orbit under the lower Gem ceiling; it records actual room photographs. `FEEDS_ONLY=1 npm run test:architecture-browser` uses a fresh standard round for all six feeds at center and both pan limits plus actual body-click inspections. Splitting the visual tour prevents it exceeding the normal six-minute game timer. Those screenshots are separate from the floor-plan drawing. Exact completed runs are listed in the delivery summary.
