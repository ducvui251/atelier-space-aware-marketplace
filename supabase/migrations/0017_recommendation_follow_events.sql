-- Phase 3 (§4.7): recommendation.follows is a plain toggle table — unfollow
-- hard-deletes the row, so there is no way to answer "followers X periods
-- ago" (needed for the Audience metric's growth-vs-previous-period). This
-- adds an append-only event ledger alongside it; follows itself keeps
-- being the fast "is this buyer following this artist" check.

create table if not exists recommendation.follow_events (
  id uuid primary key default gen_random_uuid(),
  buyer_id uuid not null,
  artist_id uuid not null,
  event_type varchar(10) not null check (event_type in ('followed', 'unfollowed')),
  created_at timestamptz not null default now()
);

create index if not exists follow_events_artist_created_idx
  on recommendation.follow_events (artist_id, created_at);

-- Backfill: every currently-active follow relationship gets a synthetic
-- 'followed' event at its original created_at, so historical
-- follower-count reconstruction works immediately instead of only for
-- follow/unfollow actions from now on. Safe to re-run.
insert into recommendation.follow_events (buyer_id, artist_id, event_type, created_at)
select f.buyer_id, f.artist_id, 'followed', f.created_at
from recommendation.follows f
where not exists (
  select 1 from recommendation.follow_events fe
  where fe.buyer_id = f.buyer_id and fe.artist_id = f.artist_id and fe.event_type = 'followed'
);
