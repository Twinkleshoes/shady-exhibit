# Atrium layout — implementation notes

The museum is one continuous 1400 × 1400-unit floor. The north Gem Gallery links to the west Sculpture Gallery and east History Gallery. The short south passage links west and east. The central atrium opens directly to all three galleries and to the south passage, so both the north and south routes bypass the atrium. Seven wall openings are 140 units wide; the atrium/south boundary is an open transition.

Reception, benches and the central sculpture break up the atrium. The main entrance is represented by visible closed exterior doors on the southern boundary. Security Holding is southwest of the atrium and escape is southeast. The holding cell is intentionally closed; rescue relocates detained teammates to safe positions outside it.

A visible partition and plinth prevent a single feed from monitoring rescue and escape together. The rescue approach remains clear beside the holding room, including clearance for a carried display. The full escape rectangle, not just its center, is sampled in the camera coverage regression.

## Shared definitions

- `src/game/world.ts`: room bounds/colors/names; walls, obstacles and railings; doorway definitions; human/NPC/capture-release spawns; lamps, displays, treasures, switches, holding and escape; sculpture/painting landmarks.
- `src/game/physics.ts`: world bounds now come from the shared map; existing authoritative collisions and shadow rules are preserved.
- `src/game/scene3d.ts`: floors/ceilings, visible obstacles and interactables are built from those definitions. Gallery arrangements differ. Ornament stays over its solid plinth footprint; it adds no hidden movement barriers.
- `src/game/navigation.ts` and `visitors.ts`: collision-expanded grid routes through the actual map, route shortcuts only where clear, natural turns/pauses and visible exhibit-viewing directions. Movable obstructions trigger rerouting.
- `src/game/cameras.ts`: six fixed optical mounts and intentional default views. Panning remains server controlled at ±50°. The existing guard visibility and physical LIVE/turning systems consume these same mounts.
- `src/game/engine.ts`: shared starting/reset positions, holding captures and rescue release positions; existing theft, inspections, disruption, multiplayer and win conditions remain in the authoritative loop.
- `src/components/MissionHUD.tsx`: room names, guard floor map, visible walls/objectives and camera markers use the new layout.

## Default puzzle approaches (optional hints)

The actual hand position, not the body or a screen-space guide, decides contact. These are approximate setup examples; use the private contact highlight before holding E.

- **Gem:** lamp west of the Royal Sapphire; stand west of the rope enclosure and cast east through the ropes. The display cases constrain approaches while the ropes stop bodies but transmit the shadow.
- **Sculpture:** the lamp begins south of the Bronze Sun. Cast north through the gap between offset solid plinths. A blocked angle clips the shadow on the solid exhibit.
- **History:** the lamp begins west of the Imperial Seal. Cast east through the opening between staggered cabinets/partitions.
- **Rescue:** the dedicated lamp is south of the lavender switch. Stand between them on the clear path beside holding and cast north. Captured teammates must exist for the release target to activate.

All four lamps and three displays can be moved using Space. Walls and the museum boundary constrain movement; there are no hidden per-gallery clamps. Replaying recreates every object from the shared default definitions.
