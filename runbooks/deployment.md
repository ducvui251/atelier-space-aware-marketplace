# Deployment Guide

The project is a Docker Compose stack (Postgres + RabbitMQ + 8 Node
microservices + a Next.js web-gateway) with no Kubernetes manifests, so the
deployment model this guide covers is: **one VM running Docker + Docker
Compose**, with a reverse proxy in front of it for TLS. That matches what's
actually built; don't reach for k8s/ECS without rebuilding the deploy
tooling around it.

## 1. Before you deploy — required changes from the local-dev defaults

These are dev-only shortcuts in the current `docker-compose.yml` / `.env` that
must change before this is reachable by anyone other than you:

1. **`ATELIER_INTERNAL_SERVICE_TOKEN`** — every service falls back to the
   literal string `dev-only-internal-token` when this env var is unset
   (see e.g. [docker-compose.yml:48](../docker-compose.yml)). Services trust
   this token as proof a request came from another internal service. Generate
   a real secret (`openssl rand -hex 32`) and set it in the deploy host's
   `.env` — never leave the fallback live on a public host.
2. **`POSTGRES_PASSWORD`** — currently hardcoded as `atelier_local_dev` in
   `docker-compose.yml`. Move it to an env var the same way
   `ATELIER_INTERNAL_SERVICE_TOKEN` is done (`${POSTGRES_PASSWORD}`) and set a
   real password in the deploy host's `.env`, not in the committed file.
3. **Supabase Auth credentials** — done for local dev (see
   [unblock-supabase-auth.md](unblock-supabase-auth.md)); a real deployment
   needs its own Supabase project's `NEXT_PUBLIC_SUPABASE_URL` /
   `NEXT_PUBLIC_SUPABASE_ANON_KEY` in both `.env` and `.env.local`, and a
   rebuild of `web-gateway` (build-time, not runtime — see that runbook for
   why).
4. **Stripe** — real integration, test mode (see
   [stripe-integration.md](stripe-integration.md)). Set `STRIPE_SECRET_KEY`
   to your own Stripe account's key and `WEB_GATEWAY_URL` to the real public
   domain (not `localhost`) before deploying — Stripe redirects the buyer's
   browser there after payment. Switch to a live-mode key only once you've
   verified the flow end-to-end in test mode on the deploy host. Shipping
   carrier is still just a free-text field (no real carrier API) — nothing
   to configure there.
5. **Don't expose every service port publicly.** Right now each service maps
   directly to a host port (4101-4108, 5432, 5672/15672, 3000). On the deploy
   host, only `web-gateway`'s port (3000, fronted by the reverse proxy) should
   be reachable from the internet — bind the rest to `127.0.0.1` (e.g.
   `ports: ["127.0.0.1:4101:4101"]`) or drop the `ports:` mapping entirely for
   services nothing outside the Compose network needs to reach directly. This
   also closes off Postgres (5432) and the RabbitMQ management UI (15672)
   from the public internet.

## 2. Provision the host

- Any VM with Docker + Docker Compose v2 (`docker compose version`). 2 vCPU /
  4 GB RAM comfortably covers the current per-service resource limits (8
  services x 256m + postgres/broker/gateway x 512m ~= 3.5 GB ceiling).
- Install Docker: follow the official convenience script or your distro's
  packages — don't hand-roll this.
- Open only ports 80/443 (reverse proxy) and 22 (SSH) on the host firewall.

## 3. Get the code and configure secrets

```bash
git clone <your-repo-url> atelier
cd atelier
cp .env.example .env          # then fill in real values per section 1 above
```

Also populate `.env.local` for the web-gateway's Supabase vars (see
`.env.example` for the expected keys).

## 4. Apply the production-hardening compose changes

This session already added `restart: unless-stopped`, per-service
`deploy.resources.limits`, and a `web-gateway` healthcheck to
`docker-compose.yml` (validated with `docker compose config --quiet`, but
deliberately never applied to the local dev stack to avoid disrupting it
mid-session). On the deploy host this is just the normal first bring-up —
apply the port-binding change from section 1.5, then:

```bash
docker compose build
docker compose up -d
./scripts/wait-for-healthy.sh 180
```

## 5. Smoke test

```bash
ATELIER_INTERNAL_SERVICE_TOKEN=$(grep ATELIER_INTERNAL_SERVICE_TOKEN .env | cut -d= -f2) \
  ./scripts/smoke-test.sh
```

All 20 checks (8 services x `/health` + `/ready`, gateway `/` + `/api/health`,
2 business reads) should pass. See [backup-and-restore.md](backup-and-restore.md)
for restoring seed/production data if this is a fresh database.

## 6. Put a reverse proxy in front for TLS

Simplest option is Caddy (auto-HTTPS via Let's Encrypt, no manual cert
management):

```
# /etc/caddy/Caddyfile
your-domain.com {
    reverse_proxy localhost:3000
}
```

Nginx + certbot works the same way if you already run Nginx elsewhere. Either
way, only `web-gateway` (port 3000) sits behind the proxy — every other
service stays on `127.0.0.1` per section 1.5 and is reached only from inside
the Compose network.

## 7. Redeploying after a code change

```bash
git pull
docker compose build
docker compose up -d          # recreates only the services whose image changed
./scripts/wait-for-healthy.sh 180
./scripts/smoke-test.sh
```

`restart: unless-stopped` means services also survive a host reboot without
manual intervention.

## 8. Operational references

- [backup-and-restore.md](backup-and-restore.md) — take/restore a Postgres
  dump. Not yet scheduled as a cron job; run manually until that's automated.
- [migration-sequencing.md](migration-sequencing.md) — how schema migrations
  apply and how to add new ones safely.
- Logs: `docker compose logs -f <service>`. No centralized log aggregation or
  distributed tracing is set up (out of scope for this thesis deployment) —
  for a real production system beyond the thesis, that'd be the next
  investment (e.g. Loki/Grafana or an APM).
- Health: `docker compose ps` shows per-service health status directly from
  the healthchecks already defined in `docker-compose.yml`.

## 9. Known gaps, deliberately out of scope

- Load test numbers exist for one read endpoint only, on one dev machine —
  see [benchmarks.md](benchmarks.md); not a capacity plan.
- Trivy scanning is in CI but report-only (doesn't fail the build) — see
  the CI workflow comment for why.
- No distributed tracing/dashboards.
- Stripe has no webhook (see stripe-integration.md's "known
  simplifications") — a narrow window exists where a buyer's browser
  closing right after payment leaves an order stuck `pending` with nothing
  to reconcile it. Fine for a demo; a real production deployment should add
  the webhook.
- Shipping carrier is a free-text field, not a real carrier API — this is
  the one item from the original plan intentionally left out of scope, not
  a bug.
