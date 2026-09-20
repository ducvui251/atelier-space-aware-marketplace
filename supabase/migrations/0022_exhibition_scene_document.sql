-- Room Preview: versioned Exhibition Editor V2 scene document.
-- Existing room_width, room_depth, and wall_segments remain readable for
-- legacy exhibitions while V2 stores levels and editor geometry here.

alter table room_preview.exhibitions
  add column if not exists scene_document jsonb
    check (
      scene_document is null
      or (
        jsonb_typeof(scene_document) = 'object'
        and scene_document->>'version' = '1'
        and jsonb_typeof(scene_document->'levels') = 'array'
        and jsonb_typeof(scene_document->'walls') = 'array'
      )
    );
