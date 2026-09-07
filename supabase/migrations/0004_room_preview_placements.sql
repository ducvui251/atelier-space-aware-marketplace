-- Room Preview: artwork placements within a buyer-owned room.
-- room_preview.rooms already exists (0001_atelier_mvp.sql); this adds the
-- missing placement table so Room Preview owns real persistence instead of
-- an in-memory array (MICROSERVICE_100_PLAN.md Phase 2).

create table if not exists room_preview.placements (
  id uuid primary key default gen_random_uuid(),
  room_id uuid not null references room_preview.rooms(id) on delete cascade,
  artwork_id uuid not null,
  scale numeric(6,3) not null default 1.0,
  position_x numeric(8,3) not null default 0,
  position_y numeric(8,3) not null default 0,
  rotation numeric(6,2) not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists placements_room_id_idx on room_preview.placements (room_id);

create trigger placements_updated_at before update on room_preview.placements
for each row execute function platform.set_updated_at();
