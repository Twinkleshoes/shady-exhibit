# Audio polish checkpoint

The pre-edit recoverable project is `../shady-before-audio.tar.gz`. The current source checkpoint is `../shady-audio-checkpoint.tar.gz`; extract over a copy of that backup and run `npm ci`, `npm run build`, `npm start`. No downloadable release ZIPs were rebuilt for this stage.

## Implementation

- Original procedural instrumental arrangements: quiet plucked menu/lobby motif, sparse museum suspense/filtered-air ambience, a more rhythmic escape arrangement after all three treasures are stolen. Shared clock, gain crossfades and temporary cue ducking; no asset downloads or additional rendering loops.
- Original synthesized cues for buttons, confirmed joining, lamp grab/release, theft, personal capture/rescue, camera disruption, inspection start/completion/cancellation, tour, and role-appropriate victory/defeat. Removed the old duplicate tour/inspection/result hooks. A losing player now hears defeat instead of the old universal victory jingle.
- Nearby lamp/treasure/disruption foley uses quadratic distance falloff (220 map units) and wall muffling. All NPCs and thieves use the same distance-driven footstep implementation. Silent CCTV does not supply off-camera movement or holder information. Guard alerts derive only from the existing authorized server alerts. Personal inspection/capture/rescue cues inspect only the local player's flags. No new network messages, role fields, gameplay rules, collision dimensions or layout changes.
- Music/Effects sliders and master mute in menu/lobby Settings and the in-game Esc menu. Device-local preferences survive refresh; ambience follows Music. Audio initialization requires a pointer/keyboard gesture. Unsupported/blocked Web Audio leaves the interface usable. One singleton context and one scheduling interval; background tabs suspend playback and discard outstanding voices, with no catch-up burst on return. Joining/leaving/screen changes crossfade the same score.
- All score, ambience and foley synthesis is original project code; no third-party recordings or additional asset attribution are required. Distributed under the project's existing Apache-2.0 source license. No remote audio requests.

## Checks actually run

- `npm test`: 87 passed, 0 failed. New audio cases use real authoritative room/client DTOs to check role privacy, nearby-vs-distant lamp cues, guarded alerts, occlusion attenuation, inspection lifecycle, tour deduplication, music state, result/replay reset and unsupported audio. The tour audio test now explicitly unlocks a fake AudioContext and checks mute/three tones. A TypeScript control-flow narrowing issue in the existing preparation test was corrected without changing game code.
- `npm run lint` and `npm run build`: passed (existing bundle-size advisory only).
- `scripts/audio-browser.mjs`: four independent local Chromium contexts using actual Web Audio and actual museum rendering. Checks pre-gesture silence, measured nonzero output waveform, independent music/effects gain and master silence, preference reload, repeated join/leave, loading/briefing silence, gameplay score, one actual server tour announcement, hidden-tab suspend/resume, single scheduler, Esc sliders, clean lobby return and unavailable Web Audio. Escape score rendering is checked in an isolated real synthesis instance, then disposed; the final-treasure music trigger is tested in the authoritative-state unit test, not by completing another full browser heist.
- Browser captures are internal QA only, under `test-artifacts/audio/`. No public deployment, Windows/native-device listening, acoustic mix evaluation, prolonged hardware performance run or complete browser replay/heist was performed. Headless output-waveform tests confirm audio generation/routing, not subjective musical quality or device loudness. Privacy cue routing is covered by automated state tests, not a claim of human listening in four live browser sessions.

## Files

`src/utils/audio.ts`, `src/utils/audio-events.ts`, `src/components/GameAudio.tsx`, `AudioSettings.tsx`, `App.tsx`, menu/pause settings and obsolete cue-hook cleanup; focused audio test/browser harness. Existing scoreless game systems remain unchanged.
