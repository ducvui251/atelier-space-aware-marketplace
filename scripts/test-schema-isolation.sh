#!/usr/bin/env bash
# Proves database-level schema isolation (MICROSERVICE_100_PLAN.md Phase 3):
# every service's least-privilege DB role (migration 0006) must be able to
# read its own schema and must be REJECTED by Postgres itself when it tries
# to read any other service's schema — not just "no service happens to
# write that query today" (already confirmed by a source-code SQL
# inventory), but "even if one did, the database would refuse it."
set -euo pipefail

CONTAINER="${POSTGRES_CONTAINER:-datn-postgres-1}"

declare -A SCHEMA_TABLE=(
  [account]=users
  [catalog_discovery]=artwork_read_models
  [artist_artwork]=artworks
  [commerce]=orders
  [recommendation]=follows
  [verification]=artwork_verifications
  [room_preview]=rooms
  [admin]=complaints
)

schemas=(account catalog_discovery artist_artwork commerce recommendation verification room_preview admin)
failures=0
checks=0

run_query() {
  local role="$1" schema="$2" table="$3"
  docker exec "$CONTAINER" psql -U "$role" -d atelier -tAc "SELECT 1 FROM ${schema}.${table} LIMIT 1;" 2>&1
}

for schema in "${schemas[@]}"; do
  role="${schema}_service"

  # Positive: a service's own role must be able to read its own schema.
  checks=$((checks + 1))
  output=$(run_query "$role" "$schema" "${SCHEMA_TABLE[$schema]}") || true
  if [[ "$output" == *"permission denied"* ]] || [[ "$output" == *"ERROR"* ]]; then
    echo "FAIL  $role -> $schema.${SCHEMA_TABLE[$schema]} (own schema): expected access, got: $output"
    failures=$((failures + 1))
  else
    echo "OK    $role -> $schema.${SCHEMA_TABLE[$schema]} (own schema, access granted)"
  fi

  # Negative: that same role must be rejected by every OTHER schema.
  for other_schema in "${schemas[@]}"; do
    if [ "$other_schema" = "$schema" ]; then continue; fi
    checks=$((checks + 1))
    output=$(run_query "$role" "$other_schema" "${SCHEMA_TABLE[$other_schema]}") || true
    if [[ "$output" == *"permission denied"* ]]; then
      echo "OK    $role -> $other_schema.${SCHEMA_TABLE[$other_schema]} (cross-schema, correctly denied)"
    else
      echo "FAIL  $role -> $other_schema.${SCHEMA_TABLE[$other_schema]}: expected permission denied, got: $output"
      failures=$((failures + 1))
    fi
  done
done

echo ""
echo "$((checks - failures))/$checks checks passed."
if [ "$failures" -gt 0 ]; then
  echo "$failures schema-isolation check(s) failed." >&2
  exit 1
fi
echo "Schema isolation fully enforced at the database level."
