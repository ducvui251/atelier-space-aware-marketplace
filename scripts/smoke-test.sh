#!/usr/bin/env bash
# Minimal Compose smoke test (MICROSERVICE_100_PLAN.md Phase 7): hits every
# service's /health and /ready, then one real business read, over the ports
# in the project's connection registry. Exits non-zero on the first
# failure so CI fails loudly instead of a silent partial pass.
set -euo pipefail

declare -A SERVICES=(
  [account]=4101
  [catalog-discovery]=4102
  [artist-artwork]=4103
  [commerce]=4104
  [recommendation]=4105
  [verification]=4106
  [room-preview]=4107
  [admin]=4108
)

TOKEN="${ATELIER_INTERNAL_SERVICE_TOKEN:-dev-only-internal-token}"
failures=0

check() {
  local description="$1" url="$2"; shift 2
  local status
  status=$(curl -s -o /dev/null -w '%{http_code}' "$url" "$@") || status="curl_error"
  if [ "$status" = "200" ]; then
    echo "OK   $description ($status)"
  else
    echo "FAIL $description -> $status ($url)" >&2
    failures=$((failures + 1))
  fi
}

for name in "${!SERVICES[@]}"; do
  port="${SERVICES[$name]}"
  check "$name /health" "http://localhost:${port}/health"
  check "$name /ready"  "http://localhost:${port}/ready"
done

check "web-gateway /"               "http://localhost:3000/"
check "web-gateway /api/health"     "http://localhost:3000/api/health"
check "artist-artwork business read" "http://localhost:4103/v1/artist-artwork/artworks" -H "x-service-token: ${TOKEN}"
check "catalog-discovery business read" "http://localhost:4102/v1/catalog/artworks" -H "x-service-token: ${TOKEN}"

if [ "$failures" -gt 0 ]; then
  echo "$failures smoke check(s) failed." >&2
  exit 1
fi

echo "All smoke checks passed."
