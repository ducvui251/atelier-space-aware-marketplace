-- Phase 5: Commerce becomes an event producer (OrderCreated.v1,
-- PaymentSucceeded.v1) and Admin becomes its first consumer, populating a
-- read model (admin.order_feed) instead of computing order/revenue stats
-- purely via a synchronous HTTP call to Commerce on every request.
--
-- admin.order_feed is upserted from either event independently (both
-- payloads carry buyer_id/artwork_id/amount/currency), so it self-heals
-- correctly regardless of which of the two events a consumer processes
-- first — see packages/contracts/src/events.ts and
-- services/admin-service/src/infrastructure/admin-repository.ts.

create table if not exists commerce.event_outbox (
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

create index if not exists commerce_outbox_pending_idx
  on commerce.event_outbox (created_at) where published_at is null;

create table if not exists admin.processed_events (
  event_id uuid primary key,
  event_type varchar(100) not null,
  processed_at timestamptz not null default now()
);

create table if not exists admin.order_feed (
  order_id uuid primary key,
  buyer_id uuid not null,
  artwork_id uuid not null,
  amount numeric not null,
  currency varchar(10) not null,
  status varchar(20) not null default 'pending',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table commerce.event_outbox enable row level security;
alter table commerce.event_outbox force row level security;
drop policy if exists event_outbox_owning_service_only on commerce.event_outbox;
create policy event_outbox_owning_service_only on commerce.event_outbox for all to commerce_service using (true) with check (true);

alter table admin.processed_events enable row level security;
alter table admin.processed_events force row level security;
drop policy if exists processed_events_owning_service_only on admin.processed_events;
create policy processed_events_owning_service_only on admin.processed_events for all to admin_service using (true) with check (true);

alter table admin.order_feed enable row level security;
alter table admin.order_feed force row level security;
drop policy if exists order_feed_owning_service_only on admin.order_feed;
create policy order_feed_owning_service_only on admin.order_feed for all to admin_service using (true) with check (true);
