#!/usr/bin/env bash
# Dumps the atelier database from the running postgres container.
# Commands verified working end-to-end (dump -> restore into a scratch
# database -> row counts matched) — see runbooks/backup-and-restore.md.
set -euo pipefail

CONTAINER="${POSTGRES_CONTAINER:-datn-postgres-1}"
OUT_DIR="${1:-./backups}"
TIMESTAMP=$(date +%Y%m%dT%H%M%S)
OUT_FILE="${OUT_DIR}/atelier_${TIMESTAMP}.dump"

mkdir -p "$OUT_DIR"
docker exec "$CONTAINER" pg_dump -U atelier -d atelier --format=custom --file="/tmp/atelier_${TIMESTAMP}.dump"
docker cp "${CONTAINER}:/tmp/atelier_${TIMESTAMP}.dump" "$OUT_FILE"
docker exec "$CONTAINER" rm -f "/tmp/atelier_${TIMESTAMP}.dump"

echo "Backup written to ${OUT_FILE}"
