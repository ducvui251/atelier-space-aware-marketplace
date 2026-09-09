# Migration Sequencing & Idempotency

Migrations live in `supabase/migrations/` (`0001`...`0009`) and are applied,
in filename order, by Postgres's own `docker-entrypoint-initdb.d` mechanism —
every `.sql` file in that directory runs once, in lexical order, the first
time the `atelier-postgres-data` volume is initialized. There is no separate
migration runner or tracking table; ordering is enforced purely by the
`000N_` filename prefix.

## Verified 2026-09-07

Ran the full migration set against a disposable, fresh-volume container to
confirm the sequence applies cleanly end to end:

```bash
docker run -d --name atelier-migration-test \
  -e POSTGRES_DB=atelier -e POSTGRES_USER=atelier -e POSTGRES_PASSWORD=atelier_local_dev \
  -v "$(pwd)/supabase/migrations:/docker-entrypoint-initdb.d:ro" \
  postgres:16-alpine
```

Result: all 9 migrations ran without error (one benign `NOTICE: column
"description" ... already exists, skipping` from an `ADD COLUMN IF NOT
EXISTS`-style guard — expected, not a failure). Final schema/table counts
confirmed all 8 service schemas plus `platform` were created:

| schema | tables |
|---|---|
| account | 1 |
| admin | 1 |
| artist_artwork | 7 |
| catalog_discovery | 2 |
| commerce | 6 |
| platform | 1 |
| recommendation | 2 |
| room_preview | 2 |
| verification | 2 |

Container removed after verification (`docker rm -f atelier-migration-test`)
— this test never touched the real `atelier-postgres-data` volume.

## Adding a new migration

- Name it `00NN_description.sql` with the next unused number — files run in
  lexical order, so gaps or out-of-order numbers would break sequencing.
- Because there's no migration-tracking table, every statement must be safe
  to run exactly once on a fresh database: use `CREATE TABLE IF NOT EXISTS`,
  `ADD COLUMN IF NOT EXISTS`, `CREATE INDEX IF NOT EXISTS`, etc. This
  environment only ever runs the full set from empty (fresh volume, or CI's
  `docker compose up` from scratch) — there is currently no supported path
  for applying a single new migration against an already-initialized volume
  without a restart-from-empty. If that's needed later (e.g. a real
  production deploy where dropping the volume isn't an option), introduce a
  proper migration runner (e.g. `node-pg-migrate`, `Flyway`) with a tracking
  table at that point — out of scope for this thesis's local/CI Compose setup.

## Windows / Git Bash note

`docker run -v "$(pwd)/...:/container/path"` can silently mangle the
container-side path (`/docker-entrypoint-initdb.d` gets rewritten to a
Windows path, so the mount ends up empty and Postgres logs "ignoring
/docker-entrypoint-initdb.d/*"). Prefix the command with `MSYS_NO_PATHCONV=1`
to stop Git Bash from rewriting paths that are meant to stay POSIX-style
inside the container. Same fix applies to `docker exec ... /some/path`.
