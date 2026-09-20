# Atelier Exhibition Editor V2 Plan

## Decision

Do not delete the whole exhibition feature. Use Exhibition Editor V2 as the canonical editor and remove the obsolete fixed-room editor UI.

Keep the existing exhibition domain, persistence, permissions, artwork APIs, placements, and publishing workflow. Replace the current fixed-room editor layer because it cannot provide the screenshot-style workflow.

The legacy builder UI is intentionally removed; the exhibition domain, scene persistence, placement APIs, and public viewer remain available for later V2 workflow phases.

## Target workflow

```text
Define Space
      ↓
Shape Style
      ↓
Add Content
      ↓
Create Paths
      ↓
Publish & Share
```

Use the canonical management route for V2 at:

```text
/exhibitions/manage/[id]
```

Keep existing public exhibition URLs unchanged.
The former `/exhibitions/manage/[id]/v2` path remains a compatibility redirect to the canonical route.
The canonical route now uses Define Space V2 for every existing exhibition. New exhibitions use the same creation studio at `/exhibitions/manage/new`, where Select Pre-made and Create Custom produce the initial scene before the canonical route takes over. The former `/exhibitions/manage/[id]/studio` and `/exhibitions/manage/[id]/v2` paths remain compatibility redirects to the canonical route.

## Phase 0 — Preserve the current system

- Do not retain the obsolete fixed-room editor UI as a fallback.
- Do not delete the current `wall_segments` work.
- Keep `room-preview-service` as the owner of exhibition scene data.
- Preserve existing authentication, permissions, artwork verification, placements, and publishing behavior.

## Phase 1 — Build the screenshot-style Define Space editor

Create a new editor layout with:

```text
Top workflow bar
      ↓
3D editor viewport
      ↓
Right-side tool panel
```

Initial tools:

- Select
- Add level
- Draw wall
- Move wall endpoints
- Delete wall
- Undo/redo
- Grid snapping
- Orbit, pan, and zoom camera controls

First acceptance test:

```text
Open exhibition
→ Add level
→ Click start point
→ Click end point
→ Wall appears in 3D
→ Continue drawing connected walls
→ Select and edit wall
→ Save
→ Reload
→ Geometry remains identical
```

## Phase 2 — Introduce a versioned scene document

Keep `room-preview-service` as the owning service, but introduce a versioned scene model:

```ts
interface ExhibitionSceneDocument {
  version: 1;
  activeLevelId: string;
  levels: Level[];
  walls: Wall[];
  openings: Opening[];
  artworks: ArtworkPlacement[];
  paths: VisitorPath[];
}
```

Initially implement only:

```text
levels
floors
walls
```

Store the scene in service-owned persistence with a migration. Keep an adapter for older exhibitions that use rectangular rooms and existing `wall_segments` data.

Extend the existing exhibition PATCH contract instead of creating another service or public API entry point.

## Phase 3 — Complete Define Space tools

Implement:

- Doors
- Windows
- Stairs
- Wall height and thickness
- Level elevation
- Pre-made space templates
- Custom space mode

These objects must attach to scene walls rather than use fixed `front`, `back`, `left`, and `right` identifiers.

## Phase 4 — Implement the remaining workflow steps

### Shape Style

- Wall and floor materials
- Colors
- Lighting
- Environment settings

### Add Content

- Artwork library
- Verified artwork filtering
- Artwork placement on walls
- Artwork movement, scaling, and framing

### Create Paths

- Visitor path points
- Spawn point
- Optional artwork or room stops

### Publish & Share

- Reuse the existing draft, published, and archived states.
- Keep public exhibition routes unchanged.

Credits, collaboration, and AI features are out of scope unless explicitly requested.

## Phase 5 — Update visitor mode

Create a shared scene renderer for public exhibitions:

- Render the same scene document used by the editor.
- Add colliders based on actual wall geometry.
- Support doors and openings.
- Replace the current line-intersection collision prototype with robust geometry or Rapier colliders.

The existing `@react-three/rapier` dependency can support this phase.

## Phase 6 — Cutover

Switch `/exhibitions/manage/[id]` to V2 only after V2 can:

- Create and edit space
- Save and reload
- Add verified artworks
- Publish
- Render publicly
- Preserve existing exhibitions

The legacy editor UI has been removed by decision. The exhibition domain, service ownership, placement APIs, and publishing infrastructure remain.

## Definition of done

- V2 matches the screenshot's editor structure and interaction model.
- Scene data is versioned, validated, persisted, and service-owned.
- Existing exhibitions remain readable.
- Internal calls retain authentication, timeouts, correlation IDs, and stable errors.
- Wall creation, selection, editing, deletion, undo, redo, save, and reload are tested.
- Public visitors see the same geometry that artists created in the editor.
- Existing exhibitions open in the canonical V2 editor; artwork-placement migration is intentionally deferred rather than preserving a second editor UI.
