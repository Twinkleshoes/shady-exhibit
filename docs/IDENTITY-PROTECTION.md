# Thief disguise and round-start protection

The prior verified materials/character release is preserved in `shady-before-identity.zip`. The museum architecture, materials, character meshes, appearance pool, animation, speeds and puzzle rules remain.

## Rescue

A successful normal three-second shadow rescue replaces every rescued thief's appearance with another entry from the same NPC/player pool and allocates a fresh badge. All previously issued badges, including retired disguises, are reserved until that round ends. Assignment uses server-side cryptographic randomness. IDs, Socket.IO connections, usernames and thief roles are unchanged. There is no public old-to-new mapping or replacement notification.

The server changes the disguise while the captured visitor is still inside the opaque holding room. It then relocates them to one of two concealed, navigable spots in the existing privacy passage beside holding. A successful rescue can free at most two thieves, since at least one must remain free to operate the switch. No new wall or puzzle obstruction was introduced. Tests sample full body corners/center at three elevations, all six cameras, one-degree pan increments and the maximum permitted aspect ratio, using static walls alone so moving a display cannot expose the change.

Inspection state, held input, theft progress and capture/action state are cleared, and the anonymous stealing-shadow key rotates. Charges are not refunded. The guard's local selection/hover clears when its visitor disappears or is captured. Current-feed rosters and render caches drop the old badge. Retired badge inspection requests do nothing. The replacement visitor is sent to the guard only when subsequently visible under the normal camera rules. Historical capture alerts may retain the old badge; they never identify its replacement.

Thief clients retain the stable underlying teammate ID. Their badge, appearance and corresponding rendered character/shadow are rebuilt together. Nearby private markers continue to identify teammates, with the existing wall/frustum checks. The disguise remains unchanged during movement/admiring until another rescue or a new round. Rescued visitors use ordinary shared outfits, including possible duplicates of NPC outfits.

## Separated public starts and scene readiness

Twelve shared floor slots are occupied each round: three visitors in each gallery and three in the atrium/entrance area. One randomly chosen gallery slot per gallery is assigned to a thief; the other two go to NPCs. The three thief slots are shuffled among the players. Thus actual thief starting slots are also available to NPCs, and each thief begins among two ordinary visitors. Every eligible thief slot is navigable, outside holding, more than 200 map pixels from all treasures and concealed from the initial atrium feed, including body samples at the widest permitted aspect ratio. The guard has no floor avatar.

Production round start enters `briefing` after all server characters, NPCs, badges, appearances and positions have been initialized. Clients build and submit their scene's first rendered frame, then acknowledge `scene_ready` with the current `roundId`. A neutral opaque loading screen conceals the feed until all four current clients are ready. Movement, inspections, camera controls and the round clock are inactive during this barrier. Unknown, duplicate and stale acknowledgments are rejected. Disconnecting during loading aborts to the lobby without a winner and transfers the host as usual. A new round gets a new token and repeats readiness. Normal Esc/leave remains available while loading.

Custom non-rendering Socket.IO clients must acknowledge the current token themselves. Automated network clients do this explicitly; the real browser regression uses the production renderer's acknowledgment. Update both ZIPs together and refresh all browser clients after replacing a server.

## Verification

58 automated checks pass, including successful multi-thief rescue, a second rescue, badge uniqueness/retirement, unchanged connection/role, silent stale inspection invalidation, private teammate recognition, stable subsequent appearances, body concealment samples, public slot occupancy and proximity, separated starts, frozen loading, stale readiness and replay reset. Existing physics, rules, speed, camera, NPC navigation and character topology/deformation checks remain included. TypeScript and production build pass, with the existing nonfatal large-bundle warning.

Five full network scenarios passed on a local production server: original room/capture/replay/isolation, all three treasure puzzles/carrying/rescue/disruption/escape, camera pan/LIVE/cancellation/reset, every doorway and circulation loop, and two actual rescue disguise cycles with all thief peers synchronized and retired badge requests rejected. A sixth focused network scenario verifies delayed readiness, frozen time/feed, stale/duplicate acknowledgments and abort/host transfer during loading, isolated from an active room.

Four independent Chromium contexts passed the actual rendered identity regression: all twelve floor models on every thief client; hidden separated starts; normal WASD/E rescue; a different outfit and badge synchronized to all thieves; removal of retired model/badge entries; neutral guard selection; no replacement disclosure while concealed; a visible private teammate marker on the new model; subsequent natural CCTV re-entry/selection/capture without guard markers; guard victory; role rotation; fresh scene readiness; and replay reset. The private marker screenshot was visually inspected. No JavaScript page errors were recorded. The broader three-treasure heist was exercised through real network clients this stage, rather than repeating every puzzle in the browser.

The split archives are CRC-checked and merged into a fresh extraction for TypeScript/build verification using the existing installed dependencies. Source includes manifests, lockfile, original local model data, licences and PLAY-WINDOWS.cmd; assets contains the matching prebuilt client. Dependencies and temporary captures/logs are excluded. A clean internet dependency installation, Windows launcher execution, native-GPU performance and public/LAN/high-latency hosting remain untested. All current executions are localhost Linux/software-WebGL tests. Finite camera/body samples do not exhaust every possible viewpoint.

## Run

Extract both source/assets ZIPs into the same new parent folder and merge their `shady-exhibit` directories. Open that directory and run `PLAY-WINDOWS.cmd` with Node 22.12+ installed, or use `npm ci` then `npm run dev`. Refresh old client tabs. `npm run test:identity-browser` accepts TEST_URL and BROWSER_EXECUTABLE and requires a running server/Chromium; `npm run test:integration` runs the six network scenarios against TEST_URL. Unit checks use `npm test`; relevant checks also include `npm run lint` and `npm run build`.
