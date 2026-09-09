# Stripe Checkout Integration

Real Stripe integration (test mode), replacing the earlier fully-simulated
checkout. No webhook — payment is confirmed by asking Stripe directly from
the success page, which is the standard approach for local dev without a
public URL for Stripe to call back to.

## Flow

1. `POST /v1/commerce/checkout` (commerce-service):
   - Reserves inventory (unchanged from before — `RESERVATION_LEASE_MS`,
     default 10 minutes, is the window the buyer has to complete Stripe
     checkout before the reservation expires).
   - Creates orders + payments in `pending` status (not `paid` — that only
     happens once Stripe actually confirms payment).
   - Creates a Stripe Checkout Session (`stripe-client.ts`) with
     `success_url=<WEB_GATEWAY_URL>/checkout/success?session_id={CHECKOUT_SESSION_ID}`
     and `cancel_url=<WEB_GATEWAY_URL>/checkout?cancelled=1`.
   - Records the session in `commerce.checkout_sessions`
     (`stripe_session_id`, `order_ids`, `reservation_ids`, `status: 'open'`)
     — this is what lets the confirm step below know what to finalize
     without needing Stripe webhook metadata.
   - Returns `{ orders, checkoutUrl }`; the browser redirects to
     `checkoutUrl` (Stripe's hosted page).
2. Buyer pays on Stripe's page (test card `4242 4242 4242 4242`, any future
   expiry/CVC).
3. Stripe redirects the browser to `/checkout/success?session_id=...`
   (apps/web-gateway). That page calls `POST /api/checkout/confirm`, which
   proxies to `POST /v1/commerce/checkout/confirm` on commerce-service.
4. The confirm endpoint:
   - Looks up the session; if already `completed`, returns the (already
     paid) orders — idempotent against a page reload or double-call.
   - Otherwise asks Stripe directly (`checkout.sessions.retrieve`) whether
     `payment_status === 'paid'`. If not yet, returns `409` (`retryable`) —
     the success page retries a few times with a short delay
     (`RETRY_DELAYS_MS` in `checkout/success/page.tsx`) before giving up.
   - If paid: marks orders `paid`, payments `success` (with
     `provider_payment_id` = the Stripe session id), marks the session
     `completed`, and commits the held inventory reservations.

## Verified 2026-09-07

Full real run through the actual UI (not just curl): logged in as a real
Supabase-authenticated buyer, added a fresh artwork to cart, submitted
checkout, landed on Stripe's real hosted Checkout page (confirmed
`checkout.stripe.com`, sandbox mode, correct title/price), paid with the
Stripe test card, redirected back, and the order showed **Paid** on
`/orders`. Confirmed in the database: `orders.status = 'paid'`,
`payments.status = 'success'` with a real `provider_payment_id`
(`cs_test_...`), `checkout_sessions.status = 'completed'`, and the
artwork's `availability` correctly flipped to `sold`.

## Required env vars

- `STRIPE_SECRET_KEY` (commerce-service only, `sk_test_...` in dev — never
  `NEXT_PUBLIC_`, never reaches the browser)
- `WEB_GATEWAY_URL` (commerce-service — must be the URL the *buyer's
  browser* can reach, not a Docker service name; defaults to
  `http://localhost:3000` for local dev, set to the real domain in a
  deployment)

Set both in the root `.env` (`docker compose` reads it directly).

## Known simplifications (vs. a full webhook-based production setup)

- **No webhook.** If the buyer closes the tab right after paying but before
  the success page's confirm call finishes, the order stays `pending` even
  though Stripe was charged — there's nothing to reconcile it later. A
  webhook (`checkout.session.completed`) would close that gap and is the
  standard production pattern; it needs a publicly reachable endpoint
  (Stripe CLI's `stripe listen --forward-to` for local dev, a real webhook
  URL + `STRIPE_WEBHOOK_SECRET` in production) — out of scope for now,
  flagged here rather than silently skipped.
- **Idempotency-key retry path has no `checkoutUrl`.** If the exact same
  checkout request is retried with the same `Idempotency-Key` header (rare
  — a genuine client retry before the first response arrived), the
  response returns the already-created `orders` but not a fresh
  `checkoutUrl`. Not hit by the normal one-shot checkout flow.
- Refunds, disputes, and multi-currency are not handled — this integration
  covers the one-time-payment happy path plus the "not paid yet" retry, as
  needed for a thesis-scope demo.
