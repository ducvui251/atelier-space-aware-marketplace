#!/usr/bin/env bash
# Route-registry parity check (MICROSERVICE_100_PLAN.md Phase 4): every
# route actually implemented in a service's server.ts must have a matching
# entry in packages/contracts/src/routes.ts, and vice versa. Without this,
# routes.ts (and the OpenAPI doc generated from it) silently drift out of
# sync with what's actually running — exactly what happened with
# checkout/confirm and all three reservation routes before this script
# existed.
set -euo pipefail

cd "$(dirname "$0")/.."

SERVICES=(account admin artist-artwork catalog-discovery commerce recommendation room-preview verification)

implemented=$(mktemp)
registered=$(mktemp)
trap 'rm -f "$implemented" "$registered"' EXIT

for svc in "${SERVICES[@]}"; do
  grep -ohE '"(GET|POST|PATCH|DELETE) /v1/[a-zA-Z0-9/:_-]+"' "services/$svc-service/src/server.ts" 2>/dev/null \
    | tr -d '"' \
    | sed -E 's#/:([a-zA-Z0-9_]+)#/{\1}#g'
done | sort -u > "$implemented"

grep -oE '"(GET|POST|PATCH|DELETE)", path: "/v1/[a-zA-Z0-9/{}_-]+"' packages/contracts/src/routes.ts \
  | sed -E 's/", path: "/ /; s/^"//; s/"$//' \
  | sort -u > "$registered"

missing_from_registry=$(comm -23 "$implemented" "$registered")
missing_from_code=$(comm -13 "$implemented" "$registered")

failed=0

if [ -n "$missing_from_registry" ]; then
  echo "FAIL: implemented in a service but missing from packages/contracts/src/routes.ts:"
  echo "$missing_from_registry" | sed 's/^/  /'
  failed=1
fi

if [ -n "$missing_from_code" ]; then
  echo "FAIL: registered in routes.ts but no matching service route found (stale entry, or route path drifted):"
  echo "$missing_from_code" | sed 's/^/  /'
  failed=1
fi

if [ "$failed" -eq 0 ]; then
  echo "Route registry parity OK — $(wc -l < "$implemented") routes implemented, all registered."
fi

exit $failed
