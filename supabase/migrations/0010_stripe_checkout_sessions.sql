-- Real Stripe Checkout integration. Checkout now creates a Stripe Checkout
-- Session instead of marking the order paid synchronously; this table
-- tracks that pending session so the success-page confirm step (see
-- POST /v1/commerce/checkout/confirm) knows which orders and inventory
-- reservations to finalize once Stripe confirms payment. No webhook is
-- used for local dev — the buyer's browser lands back on our success page
-- carrying the session id, and that request itself asks Stripe whether the
-- session paid before finalizing anything server-side.

create table if not exists commerce.checkout_sessions (
  stripe_session_id varchar(255) primary key,
  buyer_id uuid not null,
  order_ids jsonb not null,
  reservation_ids jsonb not null,
  status varchar(20) not null default 'open' check (status in ('open', 'completed', 'expired')),
  created_at timestamptz not null default now()
);
