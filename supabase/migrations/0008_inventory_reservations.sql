-- Phase 5: formal available -> reserved -> sold state machine
-- (MICROSERVICE_100_PLAN.md section 7.3 "Inventory invariants" and section
-- 5.3's reservation contract). Replaces Commerce's previous
-- read-then-PATCH-availability-with-manual-compensation checkout step —
-- that pattern was already race-safe (the conditional UPDATE in
-- updatePersistedAvailability only ever matches one concurrent writer), but
-- collapsed reserve+sell into a single step with no lease/expiry and no
-- record of *why* an artwork left "available".

create table if not exists artist_artwork.inventory_reservations (
  id uuid primary key default gen_random_uuid(),
  artwork_id uuid not null references artist_artwork.artworks(id),
  status varchar(20) not null default 'pending' check (status in ('pending', 'committed', 'released', 'expired')),
  reserved_by uuid not null,
  expires_at timestamptz not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- At most one *active* (pending) reservation per artwork at a time — this
-- partial unique index is what actually makes reservation atomic under
-- concurrent requests, the same way updatePersistedAvailability's
-- conditional UPDATE did before.
create unique index if not exists inventory_reservations_active_idx
  on artist_artwork.inventory_reservations (artwork_id) where status = 'pending';

create index if not exists inventory_reservations_expiry_idx
  on artist_artwork.inventory_reservations (expires_at) where status = 'pending';

create trigger inventory_reservations_updated_at before update on artist_artwork.inventory_reservations
for each row execute function platform.set_updated_at();
