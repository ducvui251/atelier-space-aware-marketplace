#!/usr/bin/env bash
# Permanently removes the artworks sourced from the Art Institute of
# Chicago's public API (scripts/pull-aic-artworks.mjs). That source's image
# CDN (www.artic.edu/iiif/*) turned out to sit behind an interactive
# Cloudflare bot-protection challenge that blocks every viewer — not a rate
# limit, a hard wall — so none of these images can ever render, in the 2D
# catalog or the 3D exhibition builder. They were first set to
# verification_status='rejected' (hiding them from the public catalog and
# the exhibition builder's artwork list) as an interim measure; this script
# removes them outright since there is no path to making them usable.
#
# Safe to re-run: matches purely on the image host, so running it again
# after the rows are already gone (or against a database that never had
# them) is a no-op. Confirmed before writing this script that none of these
# rows are referenced by any exhibition_placements, inventory_reservations,
# or artwork_tags row — a plain delete needs no further cleanup elsewhere.
#
# Usage: bash scripts/delete-aic-artworks.sh
# Requires: the postgres container running (docker compose up postgres).
set -euo pipefail

CONTAINER="${POSTGRES_CONTAINER:-datn-postgres-1}"
DB_USER="${POSTGRES_USER:-atelier}"
DB_NAME="${POSTGRES_DB:-atelier}"

echo "Artworks about to be deleted:"
docker exec "$CONTAINER" psql -U "$DB_USER" -d "$DB_NAME" -c "
  select count(*) as aic_artworks
  from artist_artwork.artworks a
  join artist_artwork.artwork_images i on i.artwork_id = a.id and i.is_primary
  where i.image_url like 'https://www.artic.edu/%';"

docker exec "$CONTAINER" psql -U "$DB_USER" -d "$DB_NAME" -v ON_ERROR_STOP=1 -c "
  delete from artist_artwork.artworks
  where id in (
    select a.id
    from artist_artwork.artworks a
    join artist_artwork.artwork_images i on i.artwork_id = a.id and i.is_primary
    where i.image_url like 'https://www.artic.edu/%'
  );"

echo "Done. Remaining artist_artwork.artworks referencing artic.edu (should be 0):"
docker exec "$CONTAINER" psql -U "$DB_USER" -d "$DB_NAME" -c "
  select count(*) from artist_artwork.artwork_images where image_url like 'https://www.artic.edu/%';"
