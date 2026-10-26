# Gem Gallery visual reference

The square atrium map, authoritative geometry, gameplay lamps, targets and camera mounts remain unchanged. Gem Gallery appearance is implemented in `src/game/gem-gallery.ts`, called by `scene3d.ts`.

Cream walls, blue panels, brass cornices and doorway surrounds sit against existing walls. Matte limestone tiles, subtle contact shading, blue display bases, brass case edges, low-opacity glass, velvet cushions raised botanical wall planters and supporting mineral specimens use procedural geometry and textures. No downloaded assets or external services are required. Other rooms and characters retain their existing appearance.

Case bases exactly retain their server collision height and footprint. Glass above the bases is intentionally visual only, preserving the shadow puzzle and inspection sightlines. Wall details do not create new walking barriers. The Royal Sapphire remains at its original server interaction coordinates; its visible gem rests on the cushion and disappears when stolen.

## Combining downloads
Extract `shady-gem-source.zip` and `shady-gem-assets.zip` into the same parent directory. Both contain a `shady-exhibit` folder; merge those folders. Open the resulting folder and run `PLAY-WINDOWS.cmd`. Source includes the manifests and lockfile; assets includes the existing built `dist` directory. Node.js 22.12 or newer and an internet connection for initial dependency installation are required. See README.md for LAN and persistent Node server hosting instructions.

## Verification for this appearance stage

TypeScript checking, production build and all 42 existing logic checks passed. Checks cover default puzzle solutions, every doorway, NPC routes over three simulated minutes, movement collisions, camera view obstruction, inspections, shadow rules and replay reset.

Four independent localhost Chromium contexts completed normal WASD/E thefts of all three treasures, capture and shadow rescue, camera disruption, synchronized LIVE state, pan-away inspection cancellation, simultaneous escape, both winning conditions and replay with guard rotation/reset. A final wall-panel and raised-planter detail pass changed rendering only after that full run; it was rebuilt and checked separately in the final camera/inspection run.

No public deployment, real LAN session, Windows launcher execution or hardware performance benchmark was performed. Browser testing uses software WebGL on Linux. Glass is intentionally non-solid above the original solid case bases. Gallery decoration uses procedural assets, so no external image downloads are required.

The final build also passed a dedicated Gem Gallery visible-suspect selection and completed capture on CAM 02. All six camera feeds were captured and visually reviewed at center and both ±50-degree limits (18 views). No camera-housing obstruction or new decoration clipping was observed. The three thief clients retained synchronized LIVE state. Final thief/guard screenshots are delivered separately to keep the runnable ZIPs small.

## Refinement pass

The striped case tops were a real geometry issue: the navy body's top, brass cap top and the closed glass box's bottom shared a plane. The movable display's brass strips also shared its side faces. The case now has separate plinth, body, cap and inset deck heights; individual side/top glass panes have no bottom over the cap. Frame segments terminate at the corner posts rather than overlapping them. Movable display trim stands just clear of the base. The old full-screen CCTV scanline overlay was also removed for cleaner feeds.

Low-opacity radial contact shading grounds gallery visitors and the gameplay lamp; rectangular distance-based falloff follows the cases and movable display, independently of hardware shadow maps. It stays beneath the exact dark gameplay silhouette. Navy, matte stone, velvet, brushed brass and the inset deck retain different roughness settings; daylight lights/exposure were not darkened. Character models, animations, rules and all authoritative map geometry remain unchanged.

The Gem Gallery sign is a fixed wall-plane sign suspended from the atrium doorway lintel. Two older floating entrance labels were removed where they overlapped it. The Gem jammer has no floating world label; a nearby in-gallery HUD hint explains aligning the shadow hand, while the actual target prompt still requires server-compatible shadow contact. Cooldown text remains available.

Run `npm run test:gem-browser` with the server already running and TEST_URL/BROWSER_EXECUTABLE configured as described in TESTING.md. The four independent browser contexts use real movement, mouse orbit, normal shadow theft and actual guard UI. `LABEL_ONLY=1` runs the shorter final signage/prompt/guard visual check. Browser screenshots go to test-artifacts, which is excluded from downloads.

Refinement validation: all 42 existing checks, TypeScript and production build passed. Four browser sessions passed movement/orbit views of the supporting cases, nearby/absent prompt checks, three-second sapphire stealing and synchronized removal, canvas badge selection, pan-away inspection cancellation without refund, and all six feed views. After the final entrance-label cleanup and removal of the CCTV scanlines, the shorter visual check was rerun against the rebuilt client. Public hosting, actual LAN play, Windows execution and hardware-GPU temporal flicker were not tested; software WebGL view sequences were visually inspected.
