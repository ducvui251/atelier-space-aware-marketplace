-- Per-exhibition room size and wall color override, on top of the fixed
-- room_template_id appearance (3D Exhibition Implementation Plan follow-up:
-- "custom room" — artists can resize the room and recolor the walls instead
-- of only picking one of the 3 fixed templates).
--
-- All three columns are nullable and mean "use the template default" when
-- unset, so every existing exhibition keeps its current 10x10 appearance
-- unchanged. Width/depth are capped at 10 (the current fixed room size) so
-- the existing placement position bounds (+/-5, see builderPositionX/Z in
-- packages/contracts/src/v1.ts) stay valid without also having to widen
-- those and the camera far plane.

alter table room_preview.exhibitions
  add column if not exists room_width numeric(4,2)
    check (room_width is null or (room_width >= 6 and room_width <= 10)),
  add column if not exists room_depth numeric(4,2)
    check (room_depth is null or (room_depth >= 6 and room_depth <= 10)),
  add column if not exists wall_color varchar(7)
    check (wall_color is null or wall_color ~ '^#[0-9a-fA-F]{6}$');
