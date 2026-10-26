> Current geometry refinement: see `SMOOTH-VISITORS.md`. The earlier geometry counts and construction details below describe the pre-refinement checkpoint.

# Visitor models and disguises

The character model is original procedural low-poly geometry bundled in `visitor-rig.ts`, bound to a 15-bone Three.js skeleton with per-vertex skin weights. No remote model, image, font, animation clip or GLB download is required. All twelve appearance combinations use the same model/animation construction, including sweaters, jackets, trousers, skirts, backpacks, four haircuts, varied skin tones and optional caps. Body palettes never depend on role, badge or teammate flags.

The server shuffles the shared appearance pool independently of roles each round, assigns looks to three human floor visitors and nine NPCs, and sends stable appearance IDs to entitled clients. Guard clients still receive only visible anonymous visitors. Both sides render the same ID with the same rig. Captures, rescue, leaving and replay reset action state; replay can reshuffle looks.

Walking uses hip/knee/ankle bones, analytic two-bone foot placement and smooth idle/walk blending. Turning is damped. Existing server WALK_SPEED and collision sizes are unchanged for both NPCs and players. Foot placement keeps soles at floor height during stance; this is a stylized in-place animation, not measured motion capture or a guarantee of zero horizontal foot sliding at the prototype's fast movement pace.

F toggles a four-second admire action for a free player. Movement, carrying, theft, capture or round reset cancels it. NPC exhibit pauses use that same admire pose and head/arm system. F does not award objectives, pause multiplayer or avoid inspections.

Ordinary cast shadows use a humanoid silhouette. Interactive shadows add a continuous articulated reaching arm and five-finger outline. The longest fingertip and feedback ring stay at the unchanged authoritative hand coordinate. Bodies, heads, split legs and skirt shapes replace the old long rectangular strip. The guard gets only real visible reaching shadows and no private target highlight.

Floating badges are smaller. Thieves see nearby or center-targeted visible badges plus small private teammate diamonds. Guard labels appear on body hover/selection; the visible-suspect roster remains available. Shared render obstruction checks hide labels behind actual walls/exhibits. Physical pass cards stay on clothing for everyone.

## Assets and attribution

No third-party character models or animation assets were downloaded. Original rig geometry, procedural materials, animation and silhouettes are included in source. Three.js and its bundled helpers are MIT licensed; the package license is reproduced in `docs/licenses/three-LICENSE.txt`. Other runtime dependency licenses remain in their installed packages.

## Verification commands

`npm test`, `npm run lint`, `npm run build`, `npm run test:integration`, and `npm run test:browser` cover existing rules and multiplayer. `npm run test:characters-browser` runs four independent Chromium contexts, checks all 12 floor models and server/client appearance agreement, actual F input, knee/foot poses, small hover/selected badges, guard marker privacy, normal shadow theft and the rendered hand endpoint. Browser executable and TEST_URL are configurable as in TESTING.md. Read-only browser diagnostics describe only models already rendered for that client.

## Results for this stage

48 checks, TypeScript and production build passed. All four existing online integration scenarios passed (including capture/rescue, carrying, three thefts, escape, both outcomes, restart, room isolation and every doorway). The dedicated four-browser visitor run passed all twelve generated models on each thief client, synchronized looks/actions, real F input, move cancellation, actual knee poses and sampled floor-contact heights, body hover/click selection, reduced badges, no guard teammate markers, three captures, guard victory, replay and a normal sapphire steal. Rendered fingertip coordinates matched the server hand endpoint within 0.015 world units.

The first full browser run completed all three thefts and escape but exceeded its old ten-second replay wait. A focused capture-to-replay run passed with a 30-second software-rendering allowance. The final software fallback uses 0.65 pixel ratio; hardware-rendered clients retain their normal resolution. Each avatar now uses one vertex-colored skinned draw batch and conservative view culling, rather than seven material batches.

With four simultaneous software-WebGL browser sessions, all twelve floor visitors were present. Final sampled FPS on the thief clients was approximately 4–6 after warm-up, with an initial sample near 1. This environment remains slow under four rendered views; this is not a native-GPU performance claim. Hardware-GPU performance, Internet/LAN latency, public hosting and Windows launcher execution remain untested. Walking is stylized in-place animation at the preserved prototype speed, with grounded soles and possible horizontal sliding; there is no motion-capture/zero-slide guarantee.

The final full browser regression passed on the optimized build, including all three thefts, capture/rescue, disruption, escape, both wins, replay reset and deliberate guard rotation. The museum map, collision definitions, movement constants, camera definitions, shadow physics and Windows launcher were compared byte-for-byte with the pre-character checkpoint and remained unchanged.
