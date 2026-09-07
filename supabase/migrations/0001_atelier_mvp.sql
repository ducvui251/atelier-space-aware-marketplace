create extension if not exists pgcrypto;

create schema if not exists account;
create schema if not exists artist_artwork;
create schema if not exists commerce;
create schema if not exists recommendation;
create schema if not exists room_preview;
create schema if not exists verification;
create schema if not exists admin;
create schema if not exists platform;

create or replace function platform.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create table if not exists account.users (
  id uuid primary key default gen_random_uuid(),
  auth_user_id uuid unique not null,
  full_name varchar(255) not null,
  email varchar(255) unique not null,
  phone varchar(20),
  role varchar(20) not null check (role in ('buyer', 'artist', 'admin')),
  taste_profile jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists artist_artwork.artist_profiles (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null,
  display_name varchar(255) not null,
  bio text,
  location varchar(255),
  nationality varchar(100),
  portfolio_url varchar(500),
  verification_status varchar(20) not null default 'pending' check (verification_status in ('pending', 'verified', 'rejected')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
alter table artist_artwork.artist_profiles add column if not exists image_url varchar(500);

create table if not exists artist_artwork.artworks (
  id uuid primary key default gen_random_uuid(),
  artist_id uuid not null references artist_artwork.artist_profiles(id),
  title varchar(255) not null,
  description text,
  medium varchar(100),
  width_cm numeric(8, 2) not null check (width_cm > 0),
  height_cm numeric(8, 2) not null check (height_cm > 0),
  creation_year integer,
  price numeric(12, 2) not null check (price >= 0),
  currency varchar(3) not null default 'USD',
  edition_type varchar(20) not null check (edition_type in ('original', 'limited-edition')),
  edition_total integer check (edition_total is null or edition_total > 0),
  edition_available integer check (edition_available is null or edition_available >= 0),
  availability varchar(20) not null default 'available' check (availability in ('available', 'reserved', 'sold')),
  verification_status varchar(20) not null default 'pending' check (verification_status in ('pending', 'verified', 'rejected')),
  orientation varchar(20) not null check (orientation in ('portrait', 'landscape', 'square')),
  dominant_colors jsonb not null default '[]'::jsonb,
  styles jsonb not null default '[]'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
alter table artist_artwork.artworks add column if not exists description text;

create table if not exists artist_artwork.artwork_images (
  id uuid primary key default gen_random_uuid(),
  artwork_id uuid not null references artist_artwork.artworks(id) on delete cascade,
  image_url varchar(500) not null,
  alt_text varchar(500),
  is_primary boolean not null default false,
  created_at timestamptz not null default now()
);

create unique index if not exists artwork_images_one_primary
  on artist_artwork.artwork_images (artwork_id) where is_primary;

create table if not exists artist_artwork.tags (
  id uuid primary key default gen_random_uuid(),
  name varchar(100) unique not null,
  kind varchar(50) not null check (kind in ('style', 'color', 'space', 'subject'))
);

create table if not exists artist_artwork.artwork_tags (
  artwork_id uuid not null references artist_artwork.artworks(id) on delete cascade,
  tag_id uuid not null references artist_artwork.tags(id) on delete cascade,
  primary key (artwork_id, tag_id)
);

create table if not exists commerce.orders (
  id uuid primary key default gen_random_uuid(),
  buyer_id uuid not null,
  artwork_id uuid not null,
  edition_type varchar(20) not null check (edition_type in ('original', 'limited-edition')),
  total_amount numeric(12, 2) not null check (total_amount >= 0),
  currency varchar(3) not null default 'USD',
  status varchar(20) not null default 'pending' check (status in ('pending', 'confirmed', 'paid', 'shipped', 'completed', 'cancelled')),
  shipping_address jsonb not null,
  idempotency_key varchar(255) not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (buyer_id, idempotency_key)
);

create table if not exists commerce.payments (
  id uuid primary key default gen_random_uuid(),
  order_id uuid unique not null references commerce.orders(id) on delete cascade,
  provider varchar(100) not null,
  provider_payment_id varchar(255),
  amount numeric(12, 2) not null check (amount >= 0),
  method varchar(20) not null check (method in ('card', 'wallet')),
  status varchar(20) not null default 'pending' check (status in ('pending', 'success', 'failed', 'refunded')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists commerce.shipments (
  id uuid primary key default gen_random_uuid(),
  order_id uuid unique not null references commerce.orders(id) on delete cascade,
  carrier varchar(100),
  tracking_number varchar(100),
  status varchar(20) not null default 'packing' check (status in ('packing', 'in_transit', 'delivered', 'incident')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists commerce.cart_items (
  id uuid primary key default gen_random_uuid(),
  buyer_id uuid not null,
  artwork_id uuid not null,
  created_at timestamptz not null default now(),
  unique (buyer_id, artwork_id)
);

create table if not exists commerce.reviews (
  id uuid primary key default gen_random_uuid(),
  order_id uuid unique not null references commerce.orders(id) on delete cascade,
  buyer_id uuid not null,
  rating integer not null check (rating between 1 and 5),
  comment text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists recommendation.follows (
  id uuid primary key default gen_random_uuid(),
  buyer_id uuid not null,
  artist_id uuid not null,
  created_at timestamptz not null default now(),
  unique (buyer_id, artist_id)
);

create table if not exists recommendation.saved_artworks (
  id uuid primary key default gen_random_uuid(),
  buyer_id uuid not null,
  artwork_id uuid not null,
  created_at timestamptz not null default now(),
  unique (buyer_id, artwork_id)
);

create table if not exists room_preview.rooms (
  id uuid primary key default gen_random_uuid(),
  buyer_id uuid,
  name varchar(255) not null,
  room_type varchar(50) not null,
  wall_color varchar(50),
  image_url varchar(500),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists verification.artwork_verifications (
  id uuid primary key default gen_random_uuid(),
  artwork_id uuid not null,
  reviewer_id uuid,
  status varchar(20) not null default 'pending' check (status in ('pending', 'verified', 'rejected')),
  coa_url varchar(500),
  note text,
  verified_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists admin.complaints (
  id uuid primary key default gen_random_uuid(),
  order_id uuid not null,
  reporter_id uuid not null,
  reason text not null,
  evidence_url varchar(500),
  status varchar(20) not null default 'open' check (status in ('open', 'resolved', 'rejected')),
  resolution_note text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists platform.event_outbox (
  id uuid primary key default gen_random_uuid(),
  event_type varchar(100) not null,
  event_version varchar(10) not null default 'v1',
  producer_service varchar(100) not null,
  correlation_id uuid not null,
  payload jsonb not null,
  published_at timestamptz,
  attempts integer not null default 0,
  last_error text,
  created_at timestamptz not null default now()
);

create index if not exists artworks_discovery_idx
  on artist_artwork.artworks (availability, verification_status, edition_type, price);
create index if not exists orders_buyer_idx on commerce.orders (buyer_id, created_at desc);
create index if not exists cart_items_buyer_idx on commerce.cart_items (buyer_id, created_at desc);
create index if not exists reviews_buyer_idx on commerce.reviews (buyer_id, created_at desc);
create index if not exists verification_status_idx on verification.artwork_verifications (status, created_at);
create index if not exists complaints_status_idx on admin.complaints (status, created_at);
create index if not exists event_outbox_pending_idx on platform.event_outbox (created_at) where published_at is null;

create trigger users_updated_at before update on account.users
for each row execute function platform.set_updated_at();
create trigger artist_profiles_updated_at before update on artist_artwork.artist_profiles
for each row execute function platform.set_updated_at();
create trigger artworks_updated_at before update on artist_artwork.artworks
for each row execute function platform.set_updated_at();
create trigger orders_updated_at before update on commerce.orders
for each row execute function platform.set_updated_at();
create trigger payments_updated_at before update on commerce.payments
for each row execute function platform.set_updated_at();
create trigger shipments_updated_at before update on commerce.shipments
for each row execute function platform.set_updated_at();
create trigger reviews_updated_at before update on commerce.reviews
for each row execute function platform.set_updated_at();
create trigger rooms_updated_at before update on room_preview.rooms
for each row execute function platform.set_updated_at();
create trigger verifications_updated_at before update on verification.artwork_verifications
for each row execute function platform.set_updated_at();
create trigger complaints_updated_at before update on admin.complaints
for each row execute function platform.set_updated_at();
