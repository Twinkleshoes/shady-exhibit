# Guided Tour Announcement — small implementation checkpoint

Based on the completed lamp-controls release (source/assets version 9). The square museum and current characters are retained. `shady-before-tour.zip` is the recoverable pre-change project. This checkpoint adds source changes only; the normal source/assets delivery ZIPs have deliberately not been replaced yet.

The guard confirms **Announce Guided Tour — 1 use**. The server verifies the current guard, active round and unused ability atomically. It does not switch cameras or classify visitors. The common public payload contains only used/phase/elapsed/gatherRemaining, never NPC orders, arrival counts, assigned slots or role classifications.

The north atrium, north of Confluence, has 15 spaced candidate positions. Activation requires at least 12 clear positions, reserves separate reachable NPC destinations and leaves room for players. NPC reaction delays range from 1–4 seconds. Thieves retain all ordinary controls and are never moved or penalized by the event. Captives stay in holding.

NPCs turn and walk using the shared 120-unit/second walking speed. Live geometry checks reroute paths and replace blocked destinations where possible. Gathering begins after at least eight seconds and all arrivals, or after a 55-second bounded travel wait. Gathering lasts 18 seconds; afterwards NPCs return to normal browsing. Round end, disconnect/abort and lobby cancel the event; a fresh round resets the use and all event state.

All clients receive a brief three-tone cue through the existing mute gate, a readable location/status message, a cyan map marker and a depth-tested world marker. The guard button shows spent after use. The guard gets no participant roster, automatic suspicions or new inspection privileges.

## Actually checked

- Seven focused automated tests passed (`npm run test:tour`): guard-only/single-use activation, private public-state shape, reachable capacity/spacing, varied reaction delays, actual NPC arrival and shared speed, 18-second gathering and browsing resumption, movable-obstacle rerouting and bounded timeout, thief movement/carrying/theft, captive stability, mute gating, both outcome cleanup, lobby cancellation and replay reset.
- Four independent real Socket.IO clients on a local production server (`npm run test:tour-network`) passed unauthorized activation rejection, synchronized announcement/timing, duplicate rejection, thief movement, 18-second gathering, shared completion, no reuse and disconnect/lobby cleanup.
- TypeScript and Vite build passed. The pre-existing large-bundle warning remains.

Browser confirmation-dialog behavior, visual marker placement/occlusion, audible output on devices, the broader regression suite, public hosting and Windows execution have **not** been checked in this checkpoint. These belong to the next verification/package step. Muting is tested through a mocked audio context, not a physical speaker.

The source overlay archive restores changed files under `shady-exhibit/` onto the version-9 project. Run `npm run build` after restoring it. It excludes node_modules, built assets, logs and temporary files. The existing release source/assets ZIPs remain the prior completed lamp release until the next delivery step.
