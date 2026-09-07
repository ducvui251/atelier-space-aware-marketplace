-- Verification owns artist verification history separately from artwork
-- verification history (0001 only added verification.artwork_verifications).
-- Additive only: no existing column or table is changed.
create table if not exists verification.artist_verifications (
  id uuid primary key default gen_random_uuid(),
  artist_id uuid not null,
  status varchar(20) not null default 'pending' check (status in ('pending', 'verified', 'rejected')),
  note text,
  verified_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists artist_verifications_status_idx
  on verification.artist_verifications (status, created_at);

drop trigger if exists artist_verifications_updated_at on verification.artist_verifications;
create trigger artist_verifications_updated_at before update on verification.artist_verifications
for each row execute function platform.set_updated_at();
