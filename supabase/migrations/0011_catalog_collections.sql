-- Curated collections for the discovery read model (G-17 decision in
-- MICROSERVICE_100_PLAN.md): Catalog & Discovery owns "tags, discovery
-- queries" per the ownership map, so collections live here — not in the
-- Gateway, not in Artist & Artwork. Served at GET /v1/catalog/collections.
--
-- Also rewrites the demo seed imagery from remote picsum.photos URLs to the
-- committed local static assets (ADR 0001 D7); picsum is banned from
-- production source and seeds by the Phase 0 CI gate. The UPDATE is
-- idempotent: re-running the migration on a database where imagery has
-- already moved to Storage/CDN would be wrong, so the WHERE clause only
-- touches rows still pointing at picsum.

create table if not exists catalog_discovery.collections (
  id uuid primary key,
  slug varchar(120) not null unique,
  title varchar(200) not null,
  description text not null,
  image_url text not null,
  sort_order integer not null default 0,
  created_at timestamptz not null default now()
);

create table if not exists catalog_discovery.collection_items (
  collection_id uuid not null references catalog_discovery.collections (id) on delete cascade,
  artwork_id uuid not null,
  sort_order integer not null default 0,
  primary key (collection_id, artwork_id)
);

create index if not exists collection_items_artwork_idx
  on catalog_discovery.collection_items (artwork_id);

-- The tables above are created after 0006, so their grants/RLS are applied
-- here following the same convention: the owning service role gets DML, and
-- the table is RLS-forced to that role only.
grant select, insert, update, delete on catalog_discovery.collections to catalog_discovery_service;
grant select, insert, update, delete on catalog_discovery.collection_items to catalog_discovery_service;

alter table catalog_discovery.collections enable row level security;
alter table catalog_discovery.collections force row level security;
drop policy if exists collections_owning_service_only on catalog_discovery.collections;
create policy collections_owning_service_only on catalog_discovery.collections
  for all to catalog_discovery_service using (true) with check (true);

alter table catalog_discovery.collection_items enable row level security;
alter table catalog_discovery.collection_items force row level security;
drop policy if exists collection_items_owning_service_only on catalog_discovery.collection_items;
create policy collection_items_owning_service_only on catalog_discovery.collection_items
  for all to catalog_discovery_service using (true) with check (true);

-- Curated demo collections (idempotent). artworkCount is not stored; the
-- read endpoint derives it from collection_items so counts stay truthful.
insert into catalog_discovery.collections (id, slug, title, description, image_url, sort_order)
values
  ('00000000-0000-4000-9000-000000000001', 'warm-minimal', 'Warm Minimal',
   'Quiet, sunlit works in bone, clay, and sand for calm, spacious rooms.',
   '/img/col-warm.jpg', 1),
  ('00000000-0000-4000-9000-000000000002', 'oxblood', 'The Oxblood Edit',
   'Deep, grounded color and tactile surfaces for spaces with a bit of weight.',
   '/img/col-oxblood.jpg', 2),
  ('00000000-0000-4000-9000-000000000003', 'still-life-interior', 'Still Life & Interior',
   'Windows, rooms, and quiet objects — paintings that make a house feel lived-in.',
   '/img/col-still.jpg', 3),
  ('00000000-0000-4000-9000-000000000004', 'light-and-shadow', 'Light & Shadow',
   'Photography and monochrome works that study the drama of natural light.',
   '/img/col-shadow.jpg', 4)
on conflict (id) do nothing;

insert into catalog_discovery.collection_items (collection_id, artwork_id, sort_order)
values
  ('00000000-0000-4000-9000-000000000001', '00000000-0000-4000-8000-000000001001', 1),
  ('00000000-0000-4000-9000-000000000001', '00000000-0000-4000-8000-000000001002', 2),
  ('00000000-0000-4000-9000-000000000001', '00000000-0000-4000-8000-000000001003', 3),
  ('00000000-0000-4000-9000-000000000002', '00000000-0000-4000-8000-000000001001', 1),
  ('00000000-0000-4000-9000-000000000002', '00000000-0000-4000-8000-000000001002', 2),
  ('00000000-0000-4000-9000-000000000003', '00000000-0000-4000-8000-000000001003', 1),
  ('00000000-0000-4000-9000-000000000003', '00000000-0000-4000-8000-000000001005', 2),
  ('00000000-0000-4000-9000-000000000004', '00000000-0000-4000-8000-000000001005', 1)
on conflict (collection_id, artwork_id) do nothing;

-- Rewrite remaining picsum demo imagery to committed local assets (ADR 0001
-- D7). Fresh databases seeded by 0002 (which now uses local paths) match no
-- rows; these statements exist so databases created before the seed change
-- converge on the same local assets. Rows already migrated to Storage/CDN
-- URLs are left untouched.
update artist_artwork.artist_profiles
set image_url = '/img/artist-lena.jpg'
where image_url like 'https://picsum.photos/seed/artist-lena/%';
update artist_artwork.artist_profiles
set image_url = '/img/artist-aki.jpg'
where image_url like 'https://picsum.photos/seed/artist-aki/%';
update artist_artwork.artist_profiles
set image_url = '/img/artist-maria.jpg'
where image_url like 'https://picsum.photos/seed/artist-maria/%';

update artist_artwork.artwork_images
set image_url = '/img/art-01.jpg'
where image_url like 'https://picsum.photos/seed/art-01/%';
update artist_artwork.artwork_images
set image_url = '/img/art-02.jpg'
where image_url like 'https://picsum.photos/seed/art-02/%';
update artist_artwork.artwork_images
set image_url = '/img/art-05.jpg'
where image_url like 'https://picsum.photos/seed/art-05/%';
update artist_artwork.artwork_images
set image_url = '/img/art-06.jpg'
where image_url like 'https://picsum.photos/seed/art-06/%';
update artist_artwork.artwork_images
set image_url = '/img/art-07.jpg'
where image_url like 'https://picsum.photos/seed/art-07/%';
