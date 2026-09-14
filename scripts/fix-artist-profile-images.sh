#!/usr/bin/env bash
# Assigns a real Unsplash portrait photo to every artist_profiles row that
# has no image_url. There is no API endpoint for updating an artist's own
# image_url (only /v1/artist-artwork/artists/:id/verification exists), so
# this is a direct, reproducible SQL update — the same pattern as
# scripts/fix-mock-artwork-images.sh.
#
# Safe to re-run: each UPDATE is scoped to a specific artist_profiles id and
# reapplies the same image_url, so running this again (or against a database
# where an artist already has a different image) only touches rows that are
# still NULL — see the final verification query.
#
# Usage: bash scripts/fix-artist-profile-images.sh
# Requires: the postgres container running (docker compose up postgres).
set -euo pipefail

CONTAINER="${POSTGRES_CONTAINER:-datn-postgres-1}"
DB_USER="${POSTGRES_USER:-atelier}"
DB_NAME="${POSTGRES_DB:-atelier}"

# artist_profiles.id -> a real, verified images.unsplash.com URL (curl'd for
# a 200 before being picked; no two artists below share the same photo).
declare -A FIXES=(
  ["af584cf2-fefc-4164-bbee-d97c940b970c"]="https://images.unsplash.com/photo-1560250097-0b93528c311a" # Artist One
  ["4e57c3ec-b60f-4e52-b547-f46cffb3d397"]="https://images.unsplash.com/photo-1573496359142-b8d87734a5a2" # Demo Artist
  ["d1a081f9-9aed-4359-8fbd-608af10fc359"]="https://images.unsplash.com/photo-1506863530036-1efeddceb993" # Exhibition Test Artist
  ["a476dea5-43f6-4b63-b9e0-3710ffb62d93"]="https://images.unsplash.com/photo-1519085360753-af0119f7cbe7" # G05 Test Artist
  ["bf51fbef-ae4a-4817-9520-86ef11f7d85f"]="https://images.unsplash.com/photo-1573497019940-1c28c88b4f3e" # Signup Flow Test
  ["ecfd7970-cb75-4ebc-aea2-310d11d53e1d"]="https://images.unsplash.com/photo-1494790108377-be9c29b29330" # Vu tong
)

for artist_id in "${!FIXES[@]}"; do
  url="${FIXES[$artist_id]}"
  docker exec "$CONTAINER" psql -U "$DB_USER" -d "$DB_NAME" -c \
    "update artist_artwork.artist_profiles set image_url = '$url' where id = '$artist_id' and image_url is null;"
done

echo "Done. Remaining artist profiles without an image:"
docker exec "$CONTAINER" psql -U "$DB_USER" -d "$DB_NAME" -c "
  select id, display_name from artist_artwork.artist_profiles where image_url is null;"
