-- Phase 5 (G-22): Verification gets its own event_outbox so a verification
-- decision is durably persisted in the same transaction as the outbox
-- event that will drive Artist & Artwork's projection — replacing the old
-- synchronous PATCH-before-insert sequence, which could leave the
-- projection updated with no durable record of Verification's own decision
-- if the process crashed between the PATCH and the insert (or the reverse:
-- a decision recorded with no projection update if the PATCH failed).
--
-- Artist & Artwork becomes a consumer for the first time (of
-- ArtworkVerified.v1/ArtistVerified.v1), so it needs its own
-- processed_events dedup table, mirroring catalog_discovery's from 0007.

create table if not exists verification.event_outbox (
  id uuid primary key default gen_random_uuid(),
  event_type varchar(100) not null,
  event_version varchar(10) not null default 'v1',
  aggregate_id uuid not null,
  correlation_id uuid not null,
  payload jsonb not null,
  published_at timestamptz,
  attempts integer not null default 0,
  last_error text,
  created_at timestamptz not null default now()
);

create index if not exists verification_outbox_pending_idx
  on verification.event_outbox (created_at) where published_at is null;

create table if not exists artist_artwork.processed_events (
  event_id uuid primary key,
  event_type varchar(100) not null,
  processed_at timestamptz not null default now()
);

-- RLS was not applied to the equivalent 0007 tables (artist_artwork.event_outbox,
-- catalog_discovery.processed_events) — a pre-existing gap, tracked as still
-- open rather than silently fixed here since that's a different migration's
-- tables. These two new tables get it from day one instead of repeating that gap.
alter table verification.event_outbox enable row level security;
alter table verification.event_outbox force row level security;
drop policy if exists event_outbox_owning_service_only on verification.event_outbox;
create policy event_outbox_owning_service_only on verification.event_outbox for all to verification_service using (true) with check (true);

alter table artist_artwork.processed_events enable row level security;
alter table artist_artwork.processed_events force row level security;
drop policy if exists processed_events_owning_service_only on artist_artwork.processed_events;
create policy processed_events_owning_service_only on artist_artwork.processed_events for all to artist_artwork_service using (true) with check (true);
