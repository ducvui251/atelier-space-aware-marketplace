# Backup & Restore Runbook

Covers the `postgres` service (single database `atelier`, one schema per
microservice). Verified end-to-end on 2026-09-07: dump -> restore into a
scratch database -> row counts matched the source exactly
(`commerce.orders`: 5, `artist_artwork.artworks`: 9, `account.users`: 0).

## Prerequisites

- Docker Compose stack running (`docker compose ps` shows `postgres` healthy).
- Enough local disk space for the dump (a few MB at current data volume; grows
  with production data).

## Taking a backup

```bash
./scripts/backup-db.sh [output-dir]   # defaults to ./backups
```

This runs `pg_dump --format=custom` inside the `datn-postgres-1` container,
then `docker cp`s the dump out to the host and deletes the in-container copy.
Output: `<output-dir>/atelier_<UTC-timestamp>.dump`.

**Windows / Git Bash note:** Git Bash's automatic path conversion can mangle
the container-internal `/tmp/...` path and disagree with native `docker.exe`
about host-side paths, causing `pg_dump: could not open output file` or
`docker cp: invalid output path` errors even though the script is correct
POSIX shell. Workarounds, in order of preference:
1. Run the script from WSL or a Linux CI runner (this is what it's written for).
2. On native Windows, run the three underlying commands directly from
   PowerShell instead of through the `.sh` wrapper:
   ```powershell
   docker exec datn-postgres-1 pg_dump -U atelier -d atelier --format=custom --file=/tmp/atelier_backup.dump
   docker cp datn-postgres-1:/tmp/atelier_backup.dump .\backups\atelier_backup.dump
   docker exec datn-postgres-1 rm -f /tmp/atelier_backup.dump
   ```
   This is the exact sequence the script automates, and is what was used to
   verify this runbook.

## Restoring a backup

Always restore into a scratch database first and verify before touching the
live `atelier` database.

```bash
./scripts/restore-db.sh <path-to-dump> [target-db-name]   # defaults target to atelier_restore_test
```

Then verify row counts against the source before deciding what to do next:

```bash
docker exec datn-postgres-1 psql -U atelier -d <target-db-name> -c "SELECT count(*) FROM commerce.orders;"
```

### Promoting a verified restore to production

There is no automated "promote" step — it's deliberately manual because it's
destructive. On the actual DB host (not a scratch database):

```bash
docker exec datn-postgres-1 psql -U atelier -d postgres -c "ALTER DATABASE atelier RENAME TO atelier_old;"
docker exec datn-postgres-1 psql -U atelier -d postgres -c "ALTER DATABASE <target-db-name> RENAME TO atelier;"
# once confident the new atelier is correct:
docker exec datn-postgres-1 psql -U atelier -d postgres -c "DROP DATABASE atelier_old;"
```

Renaming requires no active connections to either database — stop the
microservices first (`docker compose stop <service>...`, not `down -v`,
which would also drop the volume).

### Discarding a scratch restore

```bash
docker exec datn-postgres-1 psql -U atelier -d atelier -c "DROP DATABASE <target-db-name>;"
```

## Recommended cadence

Not yet automated as a scheduled job (out of scope for this thesis's Docker
Compose deployment; a production deployment would run `backup-db.sh` via cron
or a scheduled CI job, pushing the dump to off-host storage). Documented here
so it's a known, correct manual procedure until that automation exists.
