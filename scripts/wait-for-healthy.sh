#!/usr/bin/env bash
# Polls `docker compose ps` until every service with a healthcheck reports
# "healthy" (or the timeout elapses). Used by CI and can be run locally
# after `docker compose up -d` instead of guessing a fixed sleep.
set -euo pipefail

timeout_seconds="${1:-180}"
interval_seconds=5
elapsed=0

while true; do
  statuses=$(docker compose ps --format '{{.Name}} {{.Health}}')
  unhealthy=$(echo "$statuses" | awk '$2 != "" && $2 != "healthy" { print }')

  if [ -z "$unhealthy" ]; then
    echo "All services healthy after ${elapsed}s:"
    echo "$statuses"
    exit 0
  fi

  if [ "$elapsed" -ge "$timeout_seconds" ]; then
    echo "Timed out after ${timeout_seconds}s waiting for services to become healthy." >&2
    echo "$statuses" >&2
    exit 1
  fi

  sleep "$interval_seconds"
  elapsed=$((elapsed + interval_seconds))
done
