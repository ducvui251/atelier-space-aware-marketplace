# Failure Rehearsal Log

Evidence from actually inducing each failure mode against the running stack,
not just reading the code and assuming it works.

## Stale catalog read model (verified 2026-09-07)

**Setup:** `catalog-discovery-service` keeps a denormalized read model
(`catalog_discovery.artwork_read_models`) fed two ways: (1) events
(`artwork.published`/`verified`/`reserved`/`sold`) via the outbox -> RabbitMQ
-> consumer path for near-real-time updates, and (2) a full reconciliation
sync (`runSync`, `CATALOG_SYNC_INTERVAL_MS`, default 60s) that re-fetches
every artwork from `artist-artwork-service` and both upserts current rows and
**deletes read-model rows no longer present upstream**
([read-model-repository.ts:28](../services/catalog-discovery-service/src/infrastructure/read-model-repository.ts:28)).
The two paths together are the actual answer to "read model went stale" — it
doesn't need a human to intervene, it heals itself.

**Test 1 — new artwork appears:**
1. `POST /v1/artist-artwork/artworks` (artist-artwork-service) created a new
   artwork, id `28261bba-...`. This writes an `ArtworkPublished` outbox event
   in the same transaction.
2. Polled `GET /v1/catalog/artworks` (catalog-discovery-service) — the new
   artwork was already present on the first check (total went 9 -> 10).
   Confirms the event-driven path is delivering fast; separately verified in
   Phase 4 work that even if this path is temporarily broken (broker down),
   messages queue and get delivered once it's back.

**Test 2 — deleted artwork disappears:**
1. Deleted the test artwork directly from `artist_artwork.artworks` /
   `artwork_images` (simulating data removed at the source without a
   corresponding event — the code has no delete-artwork endpoint or event
   type, so this is the one path that can only be caught by reconciliation,
   not by the event stream).
2. Confirmed `artist-artwork-service`'s own list endpoint immediately
   reflected the deletion (total back to 9) — ruling out any source-side
   caching.
3. Confirmed `catalog-discovery-service`'s read model still showed the
   deleted artwork (total 10, stale) immediately after — this is the actual
   "stale read model" state the rehearsal is about.
4. Polled every 3s; the stale row was purged and total dropped back to 9
   within ~48s of the deletion — inside the 60s reconciliation window as
   expected, with no manual intervention.

**Conclusion:** the read model can go stale (by design — event delivery
isn't synchronous with the HTTP response, and delete has no event at all),
but it never stays stale longer than one reconciliation interval, and no
error surfaces to callers in the meantime (they just see the previous
correct-shaped data, which is standard eventual-consistency behavior for a
read model like this).

## Database unavailable (verified 2026-09-07)

**Test:** `docker stop datn-postgres-1` while the stack was otherwise running,
then immediately called `artist-artwork-service` and `catalog-discovery-service`.

**Result — a real gap, not a graceful degradation:** `artist-artwork-service`
did not return a 503; it **crashed** (unhandled exception on the broken pool
connection, `ERR_PNPM_RECURSIVE_RUN_FIRST_FAIL`, process exited with status
1). It came back automatically in ~7s only because that specific container
already had Docker's `restart: unless-stopped` policy applied
(`docker inspect` showed `RestartPolicy=unless-stopped`, `RestartCount` went
from 0 to 1). Every request during that ~7s crash-and-restart window would
have failed outright (connection refused), not received a clean error
response.

After `docker start datn-postgres-1` and the automatic container restart,
both services returned `200` again with correct data — full recovery, no
manual repair needed, no corrupted state.

**Takeaway:** the *recovery* mechanism (container restart policy) works, but
the *in-request* failure mode is a crash, not a handled error. This is
acceptable for a thesis-scope demo given the restart policy papers over it in
a few seconds, but a hardened version of this code would wrap DB calls in
try/catch and return `503 { retryable: true }` instead of crashing the whole
process on a transient connection loss — noted as a known gap, not fixed here
(scope: rehearsing failure modes, not rewriting error handling under time
pressure). Also underscores why applying the pending `docker-compose.yml`
`restart: unless-stopped` change (see [deployment.md](deployment.md)) matters
for every service, not just the ones that happen to have it already.

## Service restart during checkout (verified 2026-09-07)

**Test:** created a fresh available artwork, added it to a test buyer's cart,
fired `POST /v1/commerce/checkout` with an explicit `idempotency-key` header,
and `docker kill -s SIGKILL` on `commerce-service` at (as close as possible
to) the same instant.

**Result:** the request completed and returned a paid order before the kill
signal landed — local Postgres round-trips are fast enough that hitting the
exact in-flight window from outside the process isn't reliably reproducible
without code instrumentation. What *is* directly testable, and arguably more
representative of the real-world failure this rehearsal cares about (a
client that doesn't know whether its request succeeded because the
connection died), is retrying: `commerce-service` (unlike
`artist-artwork-service`) had no restart policy applied yet and stayed
`Exited (137)` until manually `docker start`ed. Once back up, replaying the
identical checkout request with the same `idempotency-key` returned the
**original** order (`ea1208bc-...`), not a duplicate — confirmed with
`SELECT count(*) FROM commerce.orders WHERE buyer_id = ...` = 1. The
idempotency record survives the crash because it's written to Postgres in
the same transaction as the order, not held in service memory.

**Takeaway:** idempotency-key handling does what it's supposed to across a
real crash+restart cycle — safe for a client to blindly retry a checkout it's
unsure about. Test data (artwork, cart, order, idempotency record) removed
afterward.
