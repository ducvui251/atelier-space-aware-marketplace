-- Catalog & Discovery owns a materialized read model instead of calling
-- Artist & Artwork synchronously on every search request
-- (MICROSERVICE_100_PLAN.md Phase 2). Populated by an idempotent sync
-- worker today; the same table becomes the event-consumer target once
-- Phase 4 (outbox/broker) exists — no schema change needed at that point.

create schema if not exists catalog_discovery;

create table if not exists catalog_discovery.artwork_read_models (
  id uuid primary key,
  payload jsonb not null,
  synced_at timestamptz not null default now()
);
