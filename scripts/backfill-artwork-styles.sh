#!/usr/bin/env bash
# Assigns a style tag to every artwork that has none (styles = '[]') by
# matching keywords in its `medium` field. The Met/Cleveland import scripts
# (pull-met-artworks.mjs, pull-cma-artworks.mjs) never set style/
# dominant_colors — museum "medium" fields describe technique/material
# ("Oil on canvas", "Hanging scroll; ink and color on silk"), not the
# curated style vocabulary the mock catalog used (Abstract, Minimal, ...),
# so ~4,700 imported artworks had no style at all and never matched the
# /artworks style filter.
#
# Runs raw SQL directly (not the real artwork-update API) deliberately:
# going through PATCH /v1/artist-artwork/artworks/:id would reset every one
# of these already-verified artworks back to `pending`, hiding them from
# the public catalog until re-reviewed - see updatePersistedArtwork's
# re-review-on-edit behavior. That's the right behavior for an artist's own
# content edit, wrong for a one-time metadata backfill. This only touches
# `styles`, never verification_status/availability, and catalog-discovery's
# own 60s reconciliation poll (independent of the outbox event stream)
# picks the new tags up on its own regardless.
#
# Each rule only updates rows where styles is still '[]', so rule order is
# priority order - a "tempera... on canvas" medium gets tagged Tempera, not
# re-caught by the later, broader Oil/Painting rules. Safe to re-run: once
# a row has a non-empty styles array no rule touches it again.
#
# Usage: bash scripts/backfill-artwork-styles.sh
# Requires: the postgres container running (docker compose up postgres).
set -euo pipefail

CONTAINER="${POSTGRES_CONTAINER:-datn-postgres-1}"
DB_USER="${POSTGRES_USER:-atelier}"
DB_NAME="${POSTGRES_DB:-atelier}"

run_rule() {
  local label="$1" pattern="$2" tag="$3"
  local updated
  updated=$(docker exec "$CONTAINER" psql -U "$DB_USER" -d "$DB_NAME" -t -c "
    update artist_artwork.artworks
       set styles = jsonb_build_array('${tag}'), updated_at = now()
     where styles = '[]'::jsonb
       and medium ilike '${pattern}'
    returning id;" | grep -c . || true)
  printf '%-14s %-16s -> %s\n' "$label" "$updated" "$tag"
}

echo "Untagged artworks before backfill:"
docker exec "$CONTAINER" psql -U "$DB_USER" -d "$DB_NAME" -c "
  select count(*) from artist_artwork.artworks where styles = '[]'::jsonb;"

echo ""
echo "Applying rules (in priority order):"
run_rule "fresco"     '%fresco%'                "Fresco"
run_rule "tempera"    '%tempera%'                "Tempera"
run_rule "enamel"     '%enamel%'                 "Enamel"
run_rule "gouache"    '%gouache%'                "Gouache"
run_rule "watercolor" '%water%color%'            "Watercolor"
run_rule "pastel"     '%pastel%'                 "Pastel"
run_rule "print"      '%woodblock%'              "Print"
run_rule "print"      '%print%'                  "Print"
run_rule "photograph" '%photograph%'             "Photography"
run_rule "oil"        '%oil%'                    "Oil Painting"
run_rule "ink"        '%ink%'                    "Ink Painting"
run_rule "drawing"    '%graphite%'               "Drawing"
run_rule "drawing"    '%pencil%'                 "Drawing"
run_rule "drawing"    '%charcoal%'                "Drawing"
run_rule "drawing"    '%chalk%'                  "Drawing"
run_rule "drawing"    '%drawing%'                "Drawing"
run_rule "paint"      '%paint%'                  "Painting"
run_rule "fallback"   '%'                        "Mixed Media"

echo ""
echo "Untagged artworks after backfill (should be 0):"
docker exec "$CONTAINER" psql -U "$DB_USER" -d "$DB_NAME" -c "
  select count(*) from artist_artwork.artworks where styles = '[]'::jsonb;"
