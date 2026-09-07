-- Phase 4: service-owned outbox + consumer-side dedup tables
-- (MICROSERVICE_100_PLAN.md section 7.1: "Each service owns its own outbox
-- table... No service writes another service's outbox"). The shared
-- platform.event_outbox table from 0001 is superseded for the event path
-- implemented here; it is left in place (unused) rather than dropped, since
-- dropping a table outside this migration's scope is a separate decision.

create table if not exists artist_artwork.event_outbox (
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

create index if not exists artist_artwork_outbox_pending_idx
  on artist_artwork.event_outbox (created_at) where published_at is null;

-- Consumer-side idempotency: an event id is recorded here the first time it
-- is successfully processed, so a redelivered message (broker-confirmed but
-- ack lost, or a manual replay) is a safe no-op instead of a duplicate write.
create table if not exists catalog_discovery.processed_events (
  event_id uuid primary key,
  event_type varchar(100) not null,
  processed_at timestamptz not null default now()
);
