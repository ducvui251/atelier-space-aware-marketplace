-- Phase 6 (G-04): Stripe webhook event idempotency table. The webhook
-- handler inserts the provider's event id here BEFORE acting on it — a
-- unique constraint violation means "already processed," so a duplicate
-- delivery (Stripe retries on any non-2xx, and can also just double-send)
-- returns the already-recorded outcome instead of re-applying side effects.

create table if not exists commerce.payment_events (
  id uuid primary key default gen_random_uuid(),
  provider_event_id varchar(255) not null unique,
  event_type varchar(100) not null,
  payload jsonb not null,
  processed_at timestamptz not null default now()
);

alter table commerce.payment_events enable row level security;
alter table commerce.payment_events force row level security;
drop policy if exists payment_events_owning_service_only on commerce.payment_events;
create policy payment_events_owning_service_only on commerce.payment_events for all to commerce_service using (true) with check (true);
