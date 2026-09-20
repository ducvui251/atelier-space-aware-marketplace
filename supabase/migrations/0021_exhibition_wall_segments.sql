-- Add arbitrary floor-plan wall segments to exhibitions (Artsteps-style custom rooms).
-- When non-null, wall_segments replaces the fixed 4-wall box from room_template_id
-- — floor/ceiling still render; the template only supplies color/lighting.
--
-- Each entry is a JSON object:
--   { "id": "w1", "start": [x, z], "end": [x, z], "height": 3.2, "thickness": 0.15 }
-- Coordinates are in metres, centred on the origin (≈ ±10 m range).
-- height defaults to 3.2; thickness defaults to 0.15 when omitted.

alter table room_preview.exhibitions
  add column if not exists wall_segments jsonb
    check (wall_segments is null or jsonb_typeof(wall_segments) = 'array');
