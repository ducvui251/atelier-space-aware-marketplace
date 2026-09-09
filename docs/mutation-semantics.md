# Mutation semantics (MICROSERVICE_100_PLAN.md Phase 4)

Authorization, timeout, retry, idempotency, and conflict-response behavior
for every mutating (POST/PATCH/DELETE) internal route. This documents what
the code actually does, verified against the handlers and repositories
listed — not aspirational behavior. Routes not covered by a specific row
below have no defined idempotency or conflict handling beyond generic
validation; that gap is called out explicitly rather than glossed over.

## Global policies (apply to every route below)

- **Authorization**: every route in this table requires `auth: "internal"`
  (`x-service-token` header, checked in `createServiceServer` —
  `packages/config/src/http.ts`). This is a single shared-secret trust
  domain: any caller holding the token is fully trusted by every service.
  There is currently no per-request signed caller identity distinct from
  the shared token — see G-19 (`MICROSERVICE_100_PLAN.md` Phase 4), which
  remains open.
- **Timeout**: the Gateway's `requestService()` helper
  (`apps/web-gateway/src/lib/gateway/http-client.ts`) aborts every internal
  call after **3000ms** by default. Two routes override it to **10000ms**:
  `POST /v1/commerce/checkout` and `POST /v1/commerce/checkout/confirm`
  (`commerce-checkout.client.ts`), because they call out to Stripe.
- **Retry**: **none is automatic anywhere.** `requestService()` makes a
  single attempt and throws a `ServiceClientError` (mapped to a 503) on
  timeout or network failure; nothing in the Gateway or any service retries
  a failed call. The `retryable` flag added to every error response in this
  pass (Phase 4) is advisory metadata for a future client-side or manual
  retry decision — it does not trigger a retry by itself.

## Per-mutation table

| Route | Idempotency | Conflict (409) semantics |
|---|---|---|
| `POST /v1/account/users/sync` | Idempotent upsert — repeated syncs of the same `authUserId` update the same row (`account-repository.ts`). | Not applicable; no 409 path. |
| `PATCH /v1/account/me` | Not idempotent by design (last write wins on `fullName`/`phone`); safe to repeat. | Not applicable; no 409 path. |
| `POST /v1/commerce/cart` | Idempotent: `insert ... on conflict (buyer_id, artwork_id) do nothing` (`cart-repository.ts`). Adding the same artwork twice is a no-op. | Not applicable; no 409 path. |
| `DELETE /v1/commerce/cart/{artworkId}` | Idempotent: plain `delete`, removing an absent item is a no-op. | Not applicable; no 409 path. |
| `POST /v1/commerce/checkout` | **Explicit idempotency-key protocol**: caller sends `idempotency-key` header; the request hash is persisted and a replayed key with the *same* body returns the original result. A replayed key with a *different* body is rejected. | `409 CONFLICT` when cart artwork is no longer available or reservation fails; `409 IDEMPOTENCY_KEY_REUSED` (not retryable) when the same key is reused with a different request body. |
| `POST /v1/commerce/checkout/confirm` | Idempotent by re-querying the Stripe session and the persisted checkout-session record; confirming an already-confirmed session returns the existing orders rather than re-processing. | `404 NOT_FOUND` for an unknown session; `409 PAYMENT_NOT_COMPLETE` (retryable — the client is expected to poll/retry while Stripe finalizes) when Stripe hasn't confirmed payment yet. |
| `POST /v1/artist-artwork/reservations` | **Not idempotent** — each call inserts a new reservation row; a retried call after a successful-but-unacknowledged first attempt double-reserves (mitigated in practice by checkout's own idempotency-key layer, not by this route itself). | `409 CONFLICT` when the artwork isn't `available`. |
| `POST /v1/artist-artwork/reservations/{id}/commit` | Safe to retry: the underlying `UPDATE ... where status = 'pending' and expires_at > now()` only succeeds once; a repeat call on an already-committed reservation is a no-op returning `false`. | `409 CONFLICT` when the reservation is missing, already committed/released, or expired. |
| `POST /v1/artist-artwork/reservations/{id}/release` | **Idempotent by design** (doc comment in `catalog-repository.ts`): releasing an already-released/committed/expired reservation is a no-op, never an error. | Not applicable; no 409 path. |
| `PATCH /v1/artist-artwork/artworks/{id}/availability` | Not idempotent in general (arbitrary state transition); safe to retry when the target state is unchanged. | `409 CONFLICT` when the requested transition doesn't match the current availability. |
| `POST /v1/artist-artwork/artworks` | Not idempotent — each call creates a new artwork row. Resets to `verificationStatus: "pending"`. | Not applicable; no 409 path. |
| `PATCH /v1/artist-artwork/artworks/{id}` | Not idempotent by design (edits fields, resets verification to pending); safe to repeat. | Not applicable; no 409 path. |
| `POST /v1/artist-artwork/artists/by-user/{userId}` | Idempotent provisioning (G-06): repeated calls for the same user reuse the existing artist profile rather than creating duplicates (partial unique index, migration 0012). | Not applicable; no 409 path. |
| `PATCH /v1/artist-artwork/artworks/{id}/verification`, `PATCH /v1/artist-artwork/artists/{id}/verification` | Not idempotent; applies the given decision to the read-model projection each call. | Not applicable; no 409 path (404 if the target doesn't exist). |
| `POST /v1/verification/artworks/{id}/review`, `POST /v1/verification/artists/{id}/review` | **Not idempotent — append-only**: each call `insert`s a new verification-decision row with no dedupe; calling twice records two decisions. This is intentional (audit history), not a bug, but means a retried request after a dropped response creates a duplicate decision record. | Not applicable; no 409 path (404 if the artwork/artist doesn't exist). |
| `POST /v1/recommendation/saved`, `POST /v1/recommendation/follows` | Toggle semantics, not idempotency: `insert ... on conflict do nothing` / delete based on current state. Two concurrent toggles can race to an outcome that depends on call order — no conflict detection. | Not applicable; no 409 path. |
| `POST /v1/room-preview/rooms`, `POST /v1/room-preview/rooms/{id}/placements` | Not idempotent — each call creates a new row. | `404 NOT_FOUND` if the target room doesn't exist (placements); no 409 path. |
| `DELETE /v1/room-preview/rooms/{id}/placements/{placementId}` | Idempotent: removing an absent placement is a `404`, not a crash, and repeat deletes are safe. | Not applicable; no 409 path. |
| `POST /v1/commerce/orders/{id}/ship` | Not idempotent; guarded by ownership (artist must own the order). | `403 FORBIDDEN` if the caller doesn't own the order. |
| `POST /v1/commerce/orders/{id}/confirm-received` | Not idempotent; guarded by order state. | `409 CONFLICT` when the order isn't in a `shipped` state or doesn't belong to the buyer. |
| `POST /v1/commerce/orders/{id}/reviews` | Not idempotent; guarded by order state/eligibility. | `409 CONFLICT` when the order can't be reviewed (not completed / already reviewed). |
| `POST /v1/admin/complaints` | Not idempotent — each call creates a new complaint row. | Not applicable; no 409 path. |
| `POST /v1/admin/complaints/{id}/resolve` | **Not idempotent** — plain conditional `UPDATE`; resolving an already-resolved complaint again silently overwrites `status`/`resolution_note` (last write wins, no guard against reversing a decision). | Not applicable; no 409 path (404 if the complaint doesn't exist). |

## Known gaps (tracked, not yet fixed)

- **G-19** — caller identity for `/v1/account/me` (and the `buyerId`/`authUserId`
  query params accepted throughout Commerce/Recommendation/Room Preview) is
  a caller-supplied value trusted at face value once inside the shared
  internal-token trust domain, not an independently verified principal.
- **Verification decisions are append-only with no request-level dedupe.** A
  retried review call after a dropped response creates a duplicate decision
  row rather than being detected as a repeat.
- **`POST /v1/admin/complaints/{id}/resolve` has no guard against
  re-resolving** an already-resolved or already-rejected complaint.
- **`POST /v1/artist-artwork/reservations` has no idempotency key of its
  own** — the only protection against a double-reservation from a retried
  call is the fact that commerce-service's checkout idempotency-key layer
  sits in front of it in the one place it's currently called from.
