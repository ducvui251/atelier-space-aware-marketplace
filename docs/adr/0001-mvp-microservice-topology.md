# ADR 0001 — MVP microservice topology, ownership, and runtime decisions

Status: accepted
Date: 2026-09-08
Supersedes: none
References: `PROJECT_PROMPT.md` (binding product/engineering spec), `MICROSERVICE_100_PLAN.md` §4–§8, `AGENTS.md`

## Context

Atelier is executed as a pnpm monorepo but must behave as a real service-oriented system: eight internal business services, one public Gateway, service-owned persistence, and explicit contracts. The 2026-09-08 audit (`MICROSERVICE_100_PLAN.md` §3) confirmed the topology exists in code and Compose but left several architectural decisions implicit. This ADR records them so later changes cannot silently diverge.

## Decision

### D1. Eight internal services, one Gateway

Exactly these eight services exist as independent HTTP processes (ports `4101`–`4108`): account, catalog-discovery, artist-artwork, commerce, recommendation, verification, room-preview, admin. `apps/web-gateway` (port `3000`) is the only browser-facing entry point. Browser code must not import service packages (`@atelier/*-service`) or fixture modules (`@/data`); this is lint-enforced in `apps/web-gateway` (ESLint `no-restricted-imports`) and checked by CI grep gates. The only allowed Gateway-side import of a service package is the `ServiceDefinition` constants file `src/lib/gateway/services.ts`.

### D2. PostgreSQL schema ownership

Services may share one PostgreSQL cluster during development but never share mutable tables or write across schemas. Ownership:

| Schema | Owner |
| --- | --- |
| `account` | Account |
| `catalog_discovery` | Catalog & Discovery (read models + collections) |
| `artist_artwork` | Artist & Artwork |
| `commerce` | Commerce |
| `recommendation` | Recommendation |
| `verification` | Verification |
| `room_preview` | Room Preview |
| `admin` | Admin |

Verification updates verification status through the Artist & Artwork HTTP contract; it never writes `artist_artwork.*`. Admin composes queues through service APIs/events. Any new table is created in its owner's schema by an additive migration under `supabase/migrations/`.

### D3. Collections live in Catalog & Discovery (G-17 decision)

Curated collections ("Warm Minimal", "The Oxblood Edit", …) are a discovery read-model concern. They are owned by `catalog_discovery` (tables `collections`, `collection_items`), served at `GET /v1/catalog/collections`, and consumed by the Gateway server components over HTTP. They are not fixtures in the Gateway and not an Artist & Artwork concern.

### D4. RabbitMQ transactional outbox is the event transport

The broker is the Compose service `message-broker` (RabbitMQ). Exchange `atelier.events.v1` (durable topic), dead-letter exchange `atelier.events.dlx.v1`, one durable queue per consumer service. Producers write outbox rows in the same transaction as their state change (`artist_artwork.event_outbox` pattern from migration 0007); a publisher (`packages/events`) delivers with publisher confirms. Consumers deduplicate by event ID. No browser or Gateway process ever connects to the broker. Replacing the broker requires a new ADR.

### D5. Ports and URLs are frozen registry facts

Gateway `3000`; services `4101`–`4108` in the order account, catalog-discovery, artist-artwork, commerce, recommendation, verification, room-preview, admin; PostgreSQL `5432`; RabbitMQ `5672`/`15672`. Internal URLs use Compose DNS names in Compose and `localhost` for local processes. `.docker-compose.run.yml` may remap host ports only (currently verification host `14106`). Every change to these values must update `PROJECT_PROMPT.md` §6.1, `AGENTS.md`, `.env.example`, compose files, and the plan's §2.5 discovery log in the same change (Registry Protocol).

### D6. Artist image uploads use Supabase Storage behind a Gateway relay

Artwork and COA imagery is uploaded by artists through `POST /api/uploads/image` (Gateway, server-side only), validated (session, `artist` role, MIME allow-list, size cap) and relayed into the Supabase Storage bucket `artwork-images` (public read, server-side write). The Gateway returns the public URL; Artist & Artwork stores URL records. Manual URL paste remains a secondary, clearly-labeled path. No image processing happens in the request path.

### D7. Placeholder imagery is local and static, never remote-generated

Demo/seed imagery must be deterministic local assets served from the Gateway (`public/img/*`) or real Supabase Storage objects. `picsum.photos` (or any external placeholder generator) is banned from `apps/web-gateway/src`, `services/*/src`, and seed migrations; CI greps for it. Production deployments replace local paths with CDN/Storage absolute URLs via configuration, not code changes.

### D8. Checkout identity, idempotency, and payment authority

Buyer identity is derived from the validated Supabase session at the Gateway and propagated to services; caller-supplied user IDs are not trusted as identity. Checkout requires an `Idempotency-Key`, reserves inventory through the Artist & Artwork reservation contract (`available → reserved → sold`, durable leases in `inventory_reservations`), and treats the signed Stripe webhook as the authoritative payment confirmation; the redirect-poll confirm route is a degraded fallback converging on the same idempotent state machine. Payment provider events deduplicate through `commerce.payment_events` (unique provider event ID).

## Consequences

- Lint and CI gates added in Phase 0 make violations of D1 and D7 fail the build rather than survive review.
- Gaps that remain open at the time of writing are tracked with evidence in `MICROSERVICE_100_PLAN.md` §3.3 (G-01…G-22) and closed by phases; this ADR does not claim they are closed.
- Any change to the decisions above requires a new ADR plus the registry updates mandated by `MICROSERVICE_100_PLAN.md` §2.
