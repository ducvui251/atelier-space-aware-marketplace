# Runbook — Backup and restore

Audience: operators maintaining PostgreSQL durability.
Related: `scripts/backup-db.sh`, `scripts/restore-db.sh`, `runbooks/deployment.md`.

## What must be backed up

One PostgreSQL cluster holds all service schemas (`account`, `catalog_discovery`, `artist_artwork`, `commerce`, `recommendation`, `verification`, `room_preview`, `admin`). Back up the whole cluster, not per-service databases — service ownership is at schema level, and restoring a partial cluster breaks foreign-key-free ID references across services.

Not yet covered by backups (create storage before relying on it): Supabase Auth users (managed by Supabase — use Supabase platform backups), Supabase Storage objects once image uploads ship (Phase 4+), RabbitMQ state (event outbox is replayed from PostgreSQL; the broker itself is disposable).

## Backup

```bash
bash scripts/backup-db.sh
```

Defaults target the Compose PostgreSQL on `localhost:5432` and write a timestamped `pg_dump` custom-format archive. Schedule it (cron/Task Scheduler) at least daily for any environment holding real data. Store archives off-host. After the first scheduled backup, perform one test restore (below) — a backup that has never been restored is not a backup.

## Restore

```bash
bash scripts/restore-db.sh <archive-file>
```

Steps performed/verified manually:

1. Stop writers: `docker compose stop web-gateway account-service catalog-discovery-service artist-artwork-service commerce-service recommendation-service verification-service room-preview-service admin-service`.
2. Restore into a **fresh** database (or drop/recreate `atelier`) to avoid partial overwrites.
3. Re-apply any migrations newer than the backup (`git log supabase/migrations` vs backup timestamp). Migrations are idempotent and additive by design.
4. `docker compose start` the services and run `bash scripts/wait-for-healthy.sh`.
5. Verify: artwork count via the catalog endpoint, an order lookup, and one reservation flow.

## Rollback interplay

Migration rollback is not supported: never reverse a migration to fix a deploy. If code and schema diverge, restore the database from the pre-deploy backup and redeploy the previous release (see `runbooks/deployment.md` → Rollback).

## Retention

Keep at least 7 daily + 4 weekly archives for any non-demo environment. Demo/local data may keep a single latest archive.
