-- Room Preview: 3D exhibitions (3D Exhibition Implementation Plan, Phase 6).
-- Distinct from room_preview.rooms/placements (the existing 2D single-
-- artwork room preview, untouched) -- an exhibition is a curated, walkable
-- collection of artworks, owned by either an artist or an admin.
--
-- artwork_id and creator_id are plain uuid, not foreign keys: this schema
-- cannot reference artist_artwork.artworks or account.users directly
-- (service isolation -- see scripts/test-schema-isolation.sh), so ownership
-- of the referenced artwork/creator is verified over HTTP at write time by
-- room-preview-service, not enforced by the database.

create table if not exists room_preview.exhibitions (
  id uuid primary key default gen_random_uuid(),
  title varchar(200) not null,
  slug varchar(120) not null unique,
  description text,
  creator_type varchar(10) not null check (creator_type in ('artist', 'admin')),
  creator_id uuid not null,
  room_template_id varchar(50) not null,
  status varchar(10) not null default 'draft' check (status in ('draft', 'published', 'archived')),
  featured boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists exhibitions_creator_idx on room_preview.exhibitions (creator_type, creator_id);
create index if not exists exhibitions_status_idx on room_preview.exhibitions (status);

create trigger exhibitions_updated_at before update on room_preview.exhibitions
for each row execute function platform.set_updated_at();

create table if not exists room_preview.exhibition_placements (
  id uuid primary key default gen_random_uuid(),
  exhibition_id uuid not null references room_preview.exhibitions(id) on delete cascade,
  artwork_id uuid not null,
  position_x numeric(8,3) not null default 0,
  position_y numeric(8,3) not null default 0,
  position_z numeric(8,3) not null default 0,
  rotation_x numeric(6,2) not null default 0,
  rotation_y numeric(6,2) not null default 0,
  rotation_z numeric(6,2) not null default 0,
  scale numeric(6,3) not null default 1.0,
  wall_id varchar(50),
  frame_style varchar(50),
  placement_order integer,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists exhibition_placements_exhibition_id_idx on room_preview.exhibition_placements (exhibition_id);

create trigger exhibition_placements_updated_at before update on room_preview.exhibition_placements
for each row execute function platform.set_updated_at();

alter table room_preview.exhibitions enable row level security;
alter table room_preview.exhibitions force row level security;
drop policy if exists exhibitions_owning_service_only on room_preview.exhibitions;
create policy exhibitions_owning_service_only
  on room_preview.exhibitions
  for all to room_preview_service
  using (true) with check (true);

alter table room_preview.exhibition_placements enable row level security;
alter table room_preview.exhibition_placements force row level security;
drop policy if exists exhibition_placements_owning_service_only on room_preview.exhibition_placements;
create policy exhibition_placements_owning_service_only
  on room_preview.exhibition_placements
  for all to room_preview_service
  using (true) with check (true);

grant select, insert, update, delete on room_preview.exhibitions to room_preview_service;
grant select, insert, update, delete on room_preview.exhibition_placements to room_preview_service;
