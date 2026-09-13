#!/usr/bin/env bash
# Assigns real Unsplash images to the mock/test artworks that otherwise carry
# a broken image_url (example.com, a bare host, or a Wikipedia *page* URL
# instead of a direct image). These rows are NOT seeded by any migration —
# they were created at runtime through the API during earlier live-testing
# sessions (Phase 5 order/reservation/concurrency tests, webhook tests, and
# a few manually-created demo pieces like "mona"/"tung tung") — so there is
# no schema/seed file to fix; this script is the reproducible record of the
# one-off UPDATEs that were run directly against the dev database.
#
# Safe to re-run: each UPDATE is scoped to a specific artwork_id and just
# re-applies the same image_url, so running this against a database where
# these artworks don't exist (fresh volume, or already fixed) is a no-op.
#
# Usage: bash scripts/fix-mock-artwork-images.sh
# Requires: the postgres container running (docker compose up postgres).
set -euo pipefail

CONTAINER="${POSTGRES_CONTAINER:-datn-postgres-1}"
DB_USER="${POSTGRES_USER:-atelier}"
DB_NAME="${POSTGRES_DB:-atelier}"

# artwork_id -> a real, verified images.unsplash.com URL (curl'd for a 200
# before being picked; no two artworks below share the same image).
declare -A FIXES=(
  ["9d8ae24d-3632-45e2-b214-c215b07242a4"]="https://images.unsplash.com/photo-1578926375605-eaf7559b1458" # Concurrency Race Test
  ["63cf6302-1926-4a62-ae7d-d3467d7eb78e"]="https://images.unsplash.com/photo-1578301978693-85fa9c0320b9" # Phase5 Merge Verify
  ["789f92cc-f975-4477-8069-432a031d6022"]="https://images.unsplash.com/photo-1579783928621-7a13d66a62d1" # Phase5 Order Test
  ["29456e94-4401-40d3-87bc-bfc7a774b7d2"]="https://images.unsplash.com/photo-1578301996581-bf7caec556c0" # Phase5 Order Test 2
  ["17a4a7ac-ea6f-48be-a139-3e36034aaa03"]="https://images.unsplash.com/photo-1582561424760-0321d75e81fa" # Phase5 Order Test 3
  ["1a584d25-a6b1-45ac-b8f1-f5cae9c850e1"]="https://images.unsplash.com/photo-1579783900882-c0d3dad7b119" # Phase5 Ship Merge Verify
  ["217499b5-2cf4-4a72-8552-a244b14c68b1"]="https://images.unsplash.com/photo-1515405295579-ba7b45403062" # Release Test
  ["da62c4e6-e7ea-42c2-a347-0f9d3c2e2213"]="https://images.unsplash.com/photo-1584278773680-8d940a213dcf" # Reservation Test Piece
  ["296acea5-7fa5-4c33-9952-a2bb8e025582"]="https://images.unsplash.com/photo-1581337204873-ef36aa186caa" # Stripe-Test-Painting
  ["46ecd7fc-8485-4f26-9f8f-2e720d39d9d8"]="https://images.unsplash.com/photo-1506744038136-46273834b3fb" # Test Piece
  ["06978103-6dbb-48a1-8f81-96254287b450"]="https://images.unsplash.com/photo-1578301978018-3005759f48f7" # Webhook Test Decline
  ["c4eb795a-7836-4a60-b5b4-abb4127a10c7"]="https://images.unsplash.com/photo-1579541513287-3f17a5d8d62c" # Webhook Test Success
  ["73e1009e-7640-4d51-8e60-3369e0b03b7f"]="https://images.unsplash.com/photo-1576503918400-0b982e6a98bf" # mona
  ["21dccb91-fcd7-41ad-91a4-bb6f8c5d3a08"]="https://images.unsplash.com/photo-1574184180347-527304c53004" # monalisa
  ["561e1f5d-a240-40c2-951a-50654668cb01"]="https://images.unsplash.com/photo-1536759078151-61c8b6f156a8" # tung tung
)

for artwork_id in "${!FIXES[@]}"; do
  url="${FIXES[$artwork_id]}"
  docker exec "$CONTAINER" psql -U "$DB_USER" -d "$DB_NAME" -c \
    "update artist_artwork.artwork_images set image_url = '$url' where artwork_id = '$artwork_id' and is_primary;"
done

echo "Done. Remaining artworks with an unservable image host:"
docker exec "$CONTAINER" psql -U "$DB_USER" -d "$DB_NAME" -c "
  select a.title, i.image_url
  from artist_artwork.artworks a
  join artist_artwork.artwork_images i on i.artwork_id = a.id and i.is_primary
  where not (
    i.image_url like 'https://images.unsplash.com/%'
    or i.image_url like '/img/%'
    or i.image_url like 'https://openaccess-cdn.clevelandart.org/%'
    or i.image_url like 'https://%.supabase.co/%'
  );"
