#!/usr/bin/env bash
# Populates a freshly cloned checkout with real artwork data + images, so a
# new teammate isn't looking at an empty catalog after `docker compose up`.
# Combines the two existing one-off scripts into a single onboarding step:
#   1. pull-met-artworks.mjs   — creates real, verified artworks (with real
#      Metropolitan Museum of Art images) under the 3 artist profiles that
#      migration 0002_seed_catalog.sql always seeds on a fresh volume.
#   2. backfill-artwork-styles.sh — the Met API has no style vocabulary
#      (Abstract, Minimal, ...), only a technique/material "medium" string,
#      so without this pass the new artworks would have no style tag and
#      never match the /artworks style filter.
#
# Usage: bash scripts/seed-sample-data.sh [count]
#   count defaults to 150. Each run only adds NEW artworks (both underlying
#   scripts are safe to re-run / resume).
#
# Requires: the full stack already up (`docker compose up -d` +
# `bash scripts/wait-for-healthy.sh`), Node 24, and ATELIER_INTERNAL_SERVICE_TOKEN
# set in the repo root .env (see runbooks/local-dev.md).
set -euo pipefail

COUNT="${1:-150}"

echo "== Step 1/2: pulling ${COUNT} real artworks (with images) from the Met Open Access API =="
node "$(dirname "$0")/pull-met-artworks.mjs" "$COUNT"

echo ""
echo "== Step 2/2: backfilling style tags so the new artworks show up under /artworks filters =="
bash "$(dirname "$0")/backfill-artwork-styles.sh"

echo ""
echo "Done. Reload the catalog (/artworks) to see the new listings."
