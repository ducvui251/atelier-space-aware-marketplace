# Runbook — Incident response

Audience: operators responding to a production/demo incident.
Related: `runbooks/deployment.md`, `runbooks/backup-restore.md`, `runbooks/stripe-integration.md`.

## Severity model

- **SEV1** — checkout or payment confirmation broken, data loss, security exposure (secret leaked, auth bypass). Drop everything; engage the owner.
- **SEV2** — a core journey degraded (discovery down, one service unhealthy, room preview broken) with a viable workaround.
- **SEV3** — cosmetic, non-critical page failure, or anything demo-only.

## First 15 minutes (any incident)

1. Stabilize before diagnosing. If the fix candidate is "restart the service", do `docker compose restart <service>`; if "roll back", follow `runbooks/deployment.md` → Rollback. Note the timestamp of every action.
2. Scope: `docker compose ps` and `bash scripts/wait-for-healthy.sh` identify which of the nine processes is degraded. `curl -s localhost:<port>/ready` names the failed dependency (database, broker, read-model sync) without leaking secrets.
3. Logs: `docker compose logs <service> --tail 200 --no-log-prefix`. Never paste tokens, cookies, or customer personal data into tickets or chat — quote correlation IDs instead.

## Scenario playbooks

### Database unavailable (SEV1)
- `/ready` reports `database: unavailable` across services.
- Check `docker compose ps postgres`, disk space on the volume, and connection saturation (`DB_POOL_MAX` default 10 per process).
- Do not restart PostgreSQL while a restore is in progress. If data is corrupted, go straight to `runbooks/backup-restore.md`.

### Broker unavailable (SEV2)
- Only event-enabled services (currently artist-artwork publishing, catalog-discovery consuming) degrade; the read model falls back to its poll sync.
- Business flows continue: the outbox retains unpublished events and delivers when the broker returns. Verify backlog age before declaring resolved (pending outbox count in service logs/metrics; Phase 8 adds `/metrics`).

### Stripe timeout or failure (SEV2 → SEV1 if checkout fully blocked)
- `checkout.session` creation failing → check `STRIPE_SECRET_KEY` scope and Stripe status page; see `runbooks/stripe-integration.md`.
- Buyer paid but order not confirmed (current poll-confirm mode): never invent confirmation. Verify the session ID in `commerce.checkout_sessions`, confirm payment state in the Stripe dashboard, then trigger the confirm path manually; after Phase 6 the webhook dedup table (`commerce.payment_events`) is the source of truth for what has been applied.

### Duplicate webhook / double delivery (after Phase 6, SEV3 by design)
- Duplicate deliveries are expected; deduplication by Stripe event ID makes them no-ops. Only a duplicated business effect (two orders, two payments) is an incident — capture both order IDs and the event IDs.

### Service restart during checkout (SEV2)
- Reservations have durable leases (`artist_artwork.inventory_reservations`) and expire via the background sweep; no manual inventory repair is needed. If a reservation is stuck past its expiry, verify the sweep interval and logs of artist-artwork.

### Suspected secret exposure (SEV1)
- Rotate the exposed credential first (Stripe dashboard / Supabase dashboard / regenerate `ATELIER_INTERNAL_SERVICE_TOKEN` across hosts), then investigate. Announce rotation to everyone running a deployment; a rotated internal token requires a synchronized restart of gateway + services.

## After the incident

Write a short postmortem: timeline (with correlation IDs), root cause, what made detection slow, and the follow-up task(s) filed into the plan (`MICROSERVICE_100_PLAN.md` phases or a new ADR if an architectural decision changed). Blameless; focus on the system.
