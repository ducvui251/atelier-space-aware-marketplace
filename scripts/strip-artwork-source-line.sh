#!/usr/bin/env bash
# Strips the trailing "Sourced from <museum> Open Access collection
# (<license>)." sentence that scripts/pull-met-artworks.mjs and
# scripts/pull-cma-artworks.mjs append to every imported artwork's
# description (e.g. "Rembrandt — 1660. Sourced from The Metropolitan
# Museum of Art Open Access collection (public domain)."). That sentence
# is a data-provenance note useful while pulling the data, not something a
# marketplace visitor should see attached to every artwork's description —
# it reads as leftover import metadata, not curatorial text.
#
# Leaves the "<artist> — <date>." portion intact; only removes the
# " Sourced from ... collection (...)." suffix.
#
# Safe to re-run: the regexp_replace only matches rows that still contain
# the suffix, so running this again (or against a database that never had
# it) is a no-op.
#
# Usage: bash scripts/strip-artwork-source-line.sh
# Requires: the postgres container running (docker compose up postgres).
set -euo pipefail

CONTAINER="${POSTGRES_CONTAINER:-datn-postgres-1}"
DB_USER="${POSTGRES_USER:-atelier}"
DB_NAME="${POSTGRES_DB:-atelier}"

echo "Artworks with the source line before cleanup:"
docker exec "$CONTAINER" psql -U "$DB_USER" -d "$DB_NAME" -c "
  select count(*) from artist_artwork.artworks where description like '%Open Access collection%';"

docker exec "$CONTAINER" psql -U "$DB_USER" -d "$DB_NAME" -v ON_ERROR_STOP=1 -c "
  update artist_artwork.artworks
  set description = regexp_replace(description, ' Sourced from .* Open Access collection \([^)]*\)\.\s*\$', '')
  where description like '%Open Access collection%';"

echo "Done. Remaining artworks with the source line (should be 0):"
docker exec "$CONTAINER" psql -U "$DB_USER" -d "$DB_NAME" -c "
  select count(*) from artist_artwork.artworks where description like '%Open Access collection%';"
