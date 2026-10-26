# Results case-file checkpoint

Pre-edit project: `../shady-before-results.tar.gz`. Updated source overlay: `../shady-results-checkpoint.tar.gz`. To recover, extract the backup into a separate folder, overlay the source checkpoint, then run `npm ci`, `npm run build`, `npm start`. Release source/assets ZIPs have intentionally not been regenerated at this stage.

## Behavior

The navy/cream/brass case file uses a server snapshot with confirmed outcome/reason, three miniature exhibit illustrations, taken/protected state, actual active round duration, four named role cards, each thief's final state, per-player theft/capture/innocent-inspection/rescue attribution and event totals. No scores or awards. Roles and statistics are absent from live/preparation client DTOs. Statistics key on stable player identity, never badge or appearance. A rescue activation releasing two teammates counts once; a later legitimate recapture counts as a new successful capture. Interrupted rounds have no winner or escapes, and preserve events recorded before interruption.

The server freezes a report before clearing inputs, actions, inspections, carries and tour state. Game views unmount at results; effect voices stop, leaving the existing victory/defeat cue. Reduced-motion preferences disable the short panel entrance. A disconnected device shows a separate interruption explanation: it cannot claim a final server report it did not receive.

Return to Lobby is per player, does not remove membership, and never dismisses other clients' reports. A retained results round accepts replacement members into the lobby. Departing hosts transfer control without rewriting completed outcomes; departed participants remain in the historical roster. Viewer eligibility is removed on leaving so rejoining the same room on the same socket does not resurrect an old report. Only the host may start/restart with exactly four members, and the first request atomically enters preparation so duplicates cannot start another round. New rounds clear reports/viewer flags/event counters, rotate the guard and use the existing loading → private briefing → countdown sequence for all members.

A gameplay/preparation interruption returns the underlying room to its existing lobby state with a no-winner case file over it until each remaining participant chooses Return to Lobby or Main Menu. New joiners do not receive the earlier report. Disconnecting after a completed round does not retroactively invalidate its winner.

## Verification

- `npm test`: all existing rule/physics/layout/identity/lamp/tour/preparation/audio checks plus six results checks. Results tests execute the real server engine for all three shadow thefts, actual rescue after capture, disguise replacement, recapture, an innocent two-second inspection, simultaneous capture victory, escape victory leaving a captive behind, time expiry, interruption, retained per-player views, role privacy and replay reset.
- TypeScript and production build checked. The existing large-bundle advisory remains.
- Existing four-client Socket.IO integration cases: live CCTV/cancellation, three real inspections and guard victory, guard rotation/restart/isolation, real loading barrier/stale-ready validation. Existing preparation network harness checks staggered loading, private briefings, shared countdown, disconnects in all preparation phases and failure recovery.
- New `scripts/results-network.mjs`: real interrupted-round snapshot, individual idempotent return, host transfer, replacement joins, no report disclosure to new arrivals, duplicate start/restart rejection and collective replay preparation/reset.
- New `scripts/results-browser.mjs`: four independent Chromium contexts, normal third-person WASD movement and actual guard roster/Inspect UI to capture all three thieves. Visually checks the resulting four-person server report, retained reports through individual return/host departure, replacement join, actual replay loading/briefings, transport loss and interrupted reports on both sides. Checks no gameplay canvas remains under results and 1024×600 layout.
- Thief-win and time-expiry component views are rendered from real-engine fixtures (`scripts/results-fixtures.mjs`), not injected gameplay wins or test endpoints. They are presentation checks, not another full online heist or a six-minute browser wait. Stored/OS reduced motion are checked. Browser screenshots are internal QA only.
- Public hosting, real remote latency, Windows/native GPU and speaker listening have not been tested. Full online heist and six-minute expiry were not replayed in a browser in this stage; those outcome rules and statistics were exercised in server tests.

## Main changed files

`src/game/results.ts`, `engine.ts`, `types/game.ts`, `server.ts`; results UI/CSS; App result/disconnect routing; existing audio voice cancellation and result routing; focused unit/network/browser harnesses. Museum layout, character assets, collision/puzzle/control settings and Windows launcher are unchanged.
