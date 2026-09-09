# Unblocking Supabase Auth

**Update 2026-09-07:** Stripe checkout is now a real integration (test
mode) — see [stripe-integration.md](stripe-integration.md). The note below
about Stripe not being needed is outdated; kept only for history. Shipping
carrier is still just a free-text field the artist types in (`GHN`, `DHL`,
whatever), no real tracking API — that part of the original assessment
still holds.

**Supabase Auth is the one real gap.** The code only calls
`supabase.auth.signInWithPassword({ email, password })`
([login/route.ts:16](../apps/web-gateway/src/app/api/auth/login/route.ts:16))
— no OAuth, no magic links, no signup flow. That keeps the setup small.

Also fixed as part of this: `infra/Dockerfile.gateway` and
`docker-compose.yml` didn't actually wire `NEXT_PUBLIC_SUPABASE_URL` /
`NEXT_PUBLIC_SUPABASE_ANON_KEY` into the Docker build at all — Next.js
inlines `NEXT_PUBLIC_*` vars into the bundle at `next build` time, so
setting them only in `docker-compose.yml`'s `environment:` (a runtime
setting) would have had no effect. They're now passed as Docker build args,
sourced from the root `.env` file.

## What you need to do (steps I can't do for you)

### 1. Create a Supabase project

Go to [supabase.com](https://supabase.com), sign in, and create a new
project (free tier is enough). Note the project's region — pick one close to
you for lower latency, doesn't otherwise matter for this.

### 2. Get your API credentials

In the Supabase dashboard: **Project Settings -> Data API** (or **API** on
older dashboard versions) gives you:
- **Project URL** -> `NEXT_PUBLIC_SUPABASE_URL`
- **anon / public key** -> `NEXT_PUBLIC_SUPABASE_ANON_KEY`

Never use the **service_role** key here — it bypasses RLS and must never
reach client code; this project doesn't need it.

### 3. Put the credentials in both env files

Edit **both** files (see the comment in `.env.example` for why both):

```bash
# D:\DATN\.env.local
NEXT_PUBLIC_SUPABASE_URL=https://<your-project-ref>.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=<your-anon-key>
```

```bash
# D:\DATN\.env — add the same two lines (placeholders already added by this session)
NEXT_PUBLIC_SUPABASE_URL=https://<your-project-ref>.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=<your-anon-key>
```

### 4. Create at least one test user per role

There's no self-registration flow — users are created directly in the
Supabase dashboard: **Authentication -> Users -> Add user**. Use "Add user"
(not "Invite"), which lets you set an email + password directly without
needing a working email provider.

Create at least 3, matching the roles this app has (`buyer` / `artist` /
`admin` — see
[account-repository.ts:9](../services/account-service/src/infrastructure/account-repository.ts:9)):

| Email | Password | Role |
|---|---|---|
| buyer@test.local | (pick one) | buyer (default) |
| artist@test.local | (pick one) | artist (needs promotion, see step 5) |
| admin@test.local | (pick one) | admin (needs promotion, see step 5) |

### 5. Promote artist/admin roles after first login

Every new Supabase user syncs into `account.users` as role `'buyer'` by
default on their first successful login
([account-repository.ts:71](../services/account-service/src/infrastructure/account-repository.ts:71))
— there's no UI to change your own role. Log in once as each user through
the app first (so the row gets created), then promote directly in the
database:

```bash
docker exec datn-postgres-1 psql -U atelier -d atelier -c \
  "UPDATE account.users SET role = 'artist' WHERE email = 'artist@test.local';"
docker exec datn-postgres-1 psql -U atelier -d atelier -c \
  "UPDATE account.users SET role = 'admin' WHERE email = 'admin@test.local';"
```

An artist user also needs a row in `artist_artwork.artists` linked to them to
own listings — check whether one already exists for that `auth_user_id` /
`account.users.id` and create one if not (see
`services/artist-artwork-service` for the exact schema) before testing the
artist dashboard flows.

### 6. Rebuild web-gateway (build args only take effect on rebuild)

```bash
docker compose build web-gateway
docker compose up -d web-gateway
```

A plain restart is not enough — the credentials are baked into the built
JS bundle at `docker compose build` time, not read at container start.

### 7. Verify

```bash
curl -s -X POST http://localhost:3000/api/auth/login \
  -H "content-type: application/json" \
  -d '{"email":"buyer@test.local","password":"<the password you set>"}'
```

Expect a `200` with a `token` and `user` object. A `401` means wrong
email/password; a `503` means the Supabase URL/key aren't reaching the
container (recheck step 3 and that you rebuilt in step 6).
