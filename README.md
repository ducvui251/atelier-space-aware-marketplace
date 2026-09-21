# Atelier — Art Discovery & Commerce Platform

An online art marketplace: buyers discover and buy real artwork listings (search,
personalized recommendations, 2D "view in room" preview, walkable 3D exhibitions),
artists list and manage their own work, and admins verify artists/artworks and handle
disputes. Real Postgres data, real Stripe Checkout, real Supabase Auth/Storage — this is
a working microservices system, not a mock/demo shell.

> **New here?** This README is a map. For the actual step-by-step local setup (env vars,
> Docker Compose, sample data, Stripe testing), go to **[runbooks/local-dev.md](runbooks/local-dev.md)**
> — that file is the source of truth and is kept up to date; this README is not.

## What it's built with

- **Frontend / BFF**: Next.js 15 (App Router) + React 19 + TypeScript, Tailwind CSS v4,
  Radix-based UI primitives — `apps/web-gateway/`
- **Backend**: 8 independent Node/TypeScript microservices, each owning its own Postgres
  schema and talking to the others only over internal HTTP or async events — `services/`
- **Data**: PostgreSQL (one schema per service, row-level security, migrations in
  `supabase/migrations/`), RabbitMQ (`message-broker`) as the event backbone for
  cross-service read-model sync
- **Auth & storage**: Supabase (Auth + Storage only — no Supabase DB, Postgres above is
  self-hosted via Docker)
- **Payments**: Stripe Checkout (real test-mode integration, webhook-verified)
- **3D**: React Three Fiber for the exhibition editor (custom floor plans, a live 3D
  artwork-placement gallery) and the walkable published-exhibition viewer
- **Shipping**: real Shippo API integration (rate quotes + label purchase/tracking) with
  an automatic placeholder-formula/simulated-waybill fallback when no token is set — see
  "Shipping (Shippo)" in `runbooks/local-dev.md`
- **Contracts**: a shared Zod schema + route registry package (`packages/contracts/`) that
  both sides of every internal API are generated/checked against
- **Orchestration**: Docker Compose (`docker-compose.yml`) runs the full stack locally;
  package manager is **pnpm** (workspaces)

## Quickstart

Full instructions (env vars, first-time setup, troubleshooting, Stripe tunnel testing) are
in **[runbooks/local-dev.md](runbooks/local-dev.md)**. The short version:

```sh
git clone https://github.com/ducvui251/atelier-space-aware-marketplace.git
cd atelier-space-aware-marketplace
pnpm install

# copy the env template into BOTH files the stack reads from, then fill in
# your Supabase project's URL/publishable key and a random ATELIER_INTERNAL_SERVICE_TOKEN
cp .env.example .env.local
cp .env.example .env

docker compose up -d
bash scripts/wait-for-healthy.sh

# populate the catalog with real artworks + images (a fresh DB only has a
# handful of seed rows — this makes the site worth actually browsing)
bash scripts/seed-sample-data.sh 50
```

Open [http://localhost:3000](http://localhost:3000). Services listen on `4101`–`4108`
(see the table below); Postgres on `5432`; RabbitMQ management UI on `15672`.

Prefer running the Gateway or a service directly on the host instead of in a container
(faster iteration)? See "Hybrid development" in `runbooks/local-dev.md`.

## The 8 services

| Service | Port | Owns |
| --- | --- | --- |
| `account-service` | 4101 | User accounts/profiles, identity sync from Supabase Auth |
| `catalog-discovery-service` | 4102 | Public search/browse read-model (synced from Artist & Artwork) |
| `artist-artwork-service` | 4103 | Artist profiles, artwork listings, inventory reservations |
| `commerce-service` | 4104 | Cart, Stripe checkout, orders, payments, shipments, reviews, artist earnings |
| `recommendation-service` | 4105 | Follows, saved artworks, personalized recommendations, view analytics |
| `verification-service` | 4106 | Artist/artwork verification decisions (admin review) |
| `room-preview-service` | 4107 | 2D "view in room" placements + 3D exhibition builder |
| `admin-service` | 4108 | Verification queue, platform stats, complaints |

`apps/web-gateway` is the only thing the browser ever talks to — it's the Next.js app
*and* the API Gateway/BFF that routes to these 8 services over internal HTTP.

## Everyday commands

| Command | Description |
| --- | --- |
| `pnpm dev` | Run the Gateway on the host (needs the other services reachable — see Hybrid development) |
| `pnpm validate` | Type-check + lint + contract tests + `next build` — run before pushing, matches CI |
| `pnpm type-check` | TypeScript across every workspace package |
| `pnpm lint` | Lint the Gateway |
| `pnpm test` | Run every workspace package's test suite |
| `pnpm tunnel:quick` | Start a Cloudflare Quick Tunnel wired up for Stripe redirect testing |
| `bash scripts/wait-for-healthy.sh` | Block until every Compose service reports healthy |
| `bash scripts/seed-sample-data.sh [count]` | Populate the catalog with real artworks + images |
| `bash scripts/backup-db.sh` / `restore-db.sh` | Dump/restore the local Postgres volume |

## Repository layout

- `apps/web-gateway/` — Next.js app + API Gateway/BFF (the only public-facing surface)
- `services/` — the 8 backend services listed above, each an independent deployable unit
- `packages/contracts/` — shared Zod request/response schemas and the route registry
  (`routes.ts`) that both generates `packages/contracts/openapi.json` and is checked in CI
  against every service's actual routes (`scripts/test-route-registry-parity.sh`)
- `packages/config/`, `packages/events/`, `packages/persistence/` — shared internal-auth,
  event-outbox, and DB-client infrastructure used by every service
- `supabase/migrations/` — every Postgres migration, applied in order on a fresh volume
- `scripts/` — one-off and recurring ops scripts (seeding, backups, tunnels, CI gates)
- `runbooks/` — operational docs; currently just local dev setup (`local-dev.md`)

## Known gaps

- **Exhibition Editor V2** (`/exhibitions/manage/[id]`): "1. Define Space" (draw/resize
  walls), "3. Add Content" (place artwork with wall/frame/position controls), and
  "5. Publish & Share" (slug, description, publish/unpublish) are fully working.
  "2. Shape Style" (wall color/room style) and "4. Create Paths" (camera waypoints) don't
  exist yet.
- **Shipping**: without `SHIPPO_API_TOKEN` set, rate quotes use a placeholder formula and
  "Mark as shipped" generates a simulated carrier waybill instead of a real one — see
  "Shipping (Shippo)" in `runbooks/local-dev.md`.

## Where to go next

- Setting up locally, hit an error, want Stripe test payments or real Shippo shipping
  working → [runbooks/local-dev.md](runbooks/local-dev.md)
