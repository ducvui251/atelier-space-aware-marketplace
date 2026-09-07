-- Phase 5: explicit idempotency-key persistence with request-body mismatch
-- detection (MICROSERVICE_100_PLAN.md section 9.3). Distinct from the
-- per-item `idempotency_key` column already on commerce.orders (which only
-- dedupes repeat order inserts) — this table is keyed by the caller's raw
-- idempotency key and stores a hash of the request body, so a retried
-- checkout with the *same* body returns the original result, and one with
-- a *different* body is rejected instead of silently reusing the key.

create table if not exists commerce.checkout_idempotency (
  buyer_id uuid not null,
  idempotency_key varchar(255) not null,
  request_hash varchar(64) not null,
  order_ids jsonb not null default '[]'::jsonb,
  created_at timestamptz not null default now(),
  primary key (buyer_id, idempotency_key)
);
