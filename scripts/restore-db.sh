#!/usr/bin/env bash
# Restores a dump produced by backup-db.sh into a named database.
# Usage: restore-db.sh <path-to-dump> [target-database-name]
# Defaults the target to a *_restore_test suffix so this never overwrites
# the live "atelier" database by accident — pass the real name explicitly
# for an actual disaster-recovery restore.
set -euo pipefail

DUMP_FILE="${1:?Usage: restore-db.sh <dump-file> [target-db]}"
TARGET_DB="${2:-atelier_restore_test}"
CONTAINER="${POSTGRES_CONTAINER:-datn-postgres-1}"
DUMP_BASENAME=$(basename "$DUMP_FILE")

docker exec "$CONTAINER" psql -U atelier -d atelier -c "CREATE DATABASE ${TARGET_DB};" 2>&1 || {
  echo "Database ${TARGET_DB} may already exist — continuing." >&2
}
docker cp "$DUMP_FILE" "${CONTAINER}:/tmp/${DUMP_BASENAME}"
docker exec "$CONTAINER" pg_restore -U atelier -d "$TARGET_DB" "/tmp/${DUMP_BASENAME}"
docker exec "$CONTAINER" rm -f "/tmp/${DUMP_BASENAME}"

echo "Restored ${DUMP_FILE} into database '${TARGET_DB}'."
echo "Verify row counts, then either promote it (rename databases) or drop it:"
echo "  docker exec ${CONTAINER} psql -U atelier -d atelier -c \"DROP DATABASE ${TARGET_DB};\""
