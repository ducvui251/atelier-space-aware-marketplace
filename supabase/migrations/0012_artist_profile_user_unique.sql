-- Phase 1 (G-06): self-service artist provisioning at signup needs an
-- idempotent "ensure artist profile for this account" write. A partial
-- unique index (only over non-null user_id — seed/legacy artists have none)
-- lets that write use a plain ON CONFLICT upsert instead of a
-- check-then-insert race.

create unique index if not exists artist_profiles_user_id_key
  on artist_artwork.artist_profiles (user_id)
  where user_id is not null;
