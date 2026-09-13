-- Persist privacy-preserving artwork detail views in Recommendation's
-- schema. One visitor can contribute at most one view per artwork per UTC
-- day; ON CONFLICT in the repository makes browser retries safe.
create table if not exists recommendation.artwork_views (
  artwork_id uuid not null,
  viewed_on date not null,
  viewer_hash varchar(64) not null check (viewer_hash ~ '^[a-f0-9]{64}$'),
  created_at timestamptz not null default now(),
  primary key (artwork_id, viewed_on, viewer_hash)
);

alter table recommendation.artwork_views enable row level security;
alter table recommendation.artwork_views force row level security;
drop policy if exists artwork_views_owning_service_only on recommendation.artwork_views;
create policy artwork_views_owning_service_only
  on recommendation.artwork_views
  for all to recommendation_service
  using (true) with check (true);

grant select, insert, update, delete on recommendation.artwork_views to recommendation_service;
