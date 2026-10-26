# Two-Player Duel — version 0.4.0

Four-Player Heist remains the default. The host can choose a mode from the lobby before starting. The room never removes extra players automatically. Modes lock during preparation, play and results; after results, everyone must return to the lobby before the host can change the mode. Play Again uses the same mode and rotates the guard.

| Rule | Four-Player Heist | Two-Player Duel |
|---|---|---|
| Human players / roles | 4: one guard, three thieves | 2: one guard, one thief |
| Time | Six minutes | Four minutes |
| Required treasures | Sapphire, Bronze Sun, Imperial Seal | Sapphire and Bronze Sun; Seal is decorative |
| Inspection charges | Three, individually returning after 20 seconds | Two, individually returning after 20 seconds |
| Capture | All thieves captured simultaneously wins | First capture detains for eight seconds; second capture wins |
| Release | Teammate holds the rescue switch for three seconds | One automatic concealed release; no teammate rescue |
| Disguise | Rescued visitors get a different appearance and unused badge | Automatically released thief gets a different appearance and unused badge |
| Escape | Every free thief inside the escape zone at once; at least one free | Both active treasures collected and the thief in escape while free |

Movement, collision dimensions, museum geometry, visitor models, shared walk speed, nine browsing NPCs, shadow geometry, lamp carrying, all cameras and pan limits, LIVE indicators, cover, inspection visibility, disruption and Guided Tour are shared. The designated Duel treasures use the original puzzles, not easier substitutes or altered shadow rules.

## Server and privacy

`modes.ts` defines capacity, role counts, duration, objectives, charges/recharge, capture policy, detention and release budget. The server validates every mode change, join, start and acknowledgement. `engine.ts` keeps capture counts on stable player IDs; badges never key the life count or theft statistics.

The release deadline uses the authoritative round clock rather than a detached timeout. Time continues during detention and timeout wins before any due release is processed. Release candidates must be collision-free, outside holding and the escape zone, have a navigable exit, and be hidden from all six camera views across the full permitted pan range (conservative maximum supported aspect). The existing concealed corridor is preferred, with additional concealed positions if movable furniture obstructs it. A release rotates appearance, unused badge and anonymous shadow identifier without changing socket, player ID, role, collected objects or statistics. Guard selection/inspection of the retired badge cannot transfer to the new one. A generic guard alert confirms the release without giving its badge or location.

All pending deadlines, capture counts and release-use state clear on end, interruption and lobby/replay reset. Completed reports retain their immutable event totals. First capture is idempotent while detained, and second-capture victory is resolved in that inspection's server tick. Replay starts only once and swaps roles in a two-member room.

## Checks performed

- Before editing: existing 93 automated checks; two existing real four-client Socket.IO integration scenarios, including a complete three-treasure round with capture, teammate rescue, disruption, lamp/display movement and escape.
- After implementation: all existing checks plus eight new mode tests (101 total). These cover host/capacity/phase validation, two-client readiness, objective filtering, both real shadow-rule solutions, decorative target rejection, timed detention/release, stable identity, unused badges, retained theft statistics, repeated capture/release prevention, second capture, timeout during detention, role swapping/reset, two-charge recharge maximum, mixed rooms, preserved legacy aliases and a blocked-exit concealed/navigable fallback.
- Existing live four-client integration checks passed again: capture victory and restart/isolation; full heist with capture/rescue/three thefts/escape; loading/disconnect barrier.
- New real Socket.IO Duel scenario passed host-only selection, two-player capacity, rejected oversized switch, staggered readiness, common countdown, mode locks, real eight-second release, privacy/retired badges, second capture, replay, host departure, cancellation through the old release deadline and a simultaneous standard match.
- Two independent Chromium sessions completed normal Duel play using mouse orbit, WASD, Space and E. One thief repositioned both lamps, stole the Sapphire, was inspected/detained/released with a fresh disguise while retaining it, stole the Bronze Sun and escaped. Replay swapped roles, reset all objectives/charges/pans/tour/strikes, exercised Guided Tour and reached second-capture security victory. Guard and thief scenes, lobby/loading/detention/release/results were inspected; no browser page errors. No test-only game endpoints or injected positions were used in this browser run.
- Four-browser menu/lobby regression checked errors, keyboard focus, viewport sizing through 1024×600, clipboard, empty/full slots, repeated entry/exit, host transfer and match start/leave. A new mode selector overflow was fixed and this regression passed.
- TypeScript and production build checked. Packaging checks are recorded in the delivery response and START-HERE.txt.

## Limits

Public hosting, Windows-native execution, real remote latency and speaker mix were not tested. Timeout during detention and an obstructed release fallback were checked with server-engine tests, not by waiting four minutes in a browser or moving every exhibit into every possible obstruction. The complete four-player round was exercised through real Socket.IO clients; the complete Duel was exercised through independent rendered browsers. Browser rendering used headless Chromium/SwiftShader, not a native desktop GPU.

The original four-player project was checkpointed before edits in `shady-before-duel.tar.gz`; this recovery archive is separate from the current release. No external model/audio service or API key is required. Music and sound effects are original procedural synthesis, so there are no missing MP3 files.
