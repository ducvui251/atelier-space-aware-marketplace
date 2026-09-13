# Cleveland Museum of Art Open Access reference collection

Atelier serves a paginated, read-only reference collection at `/artworks/reference`. Catalog & Discovery owns the imported metadata snapshot; the Gateway serves the downloaded images as same-site static assets. These records are not marketplace listings and have no Atelier price, inventory, checkout, saved state, or verification status.

## Source and reuse

- CMA documents its open collection in the [Open Access API](https://openaccess-api.clevelandart.org/) and [Open Access policy](https://www.clevelandart.org/open-access).
- The importer requests records with `cc0` and `has_image=1`, then verifies each record is CC0 and each web image URL is HTTPS on `openaccess-cdn.clevelandart.org`. It retains each museum record URL for attribution/context.
- CMA states that CC0 images and metadata can be reused without restriction. The snapshot records CC0 provenance but does not represent these works as Atelier listings or Atelier-verified works.

## Importing records and images

Run from the repository root:

```powershell
pnpm.cmd --filter @atelier/catalog-discovery-service import:reference -- --limit=48
```

`--limit` is optional, defaults to 48, and accepts 1–100 records per run. The importer requests pages of up to 50 records, downloads the CMA web JPEG only, and stores:

- Metadata snapshot: `services/catalog-discovery-service/src/data/cleveland-reference.json`
- Local images: `apps/web-gateway/public/img/cma-open-access/{id}_web.jpg`

The first 48 bundled records use their locally stored 900-pixel web JPEG in cards and the in-site preview. The importer retains stable CMA artwork IDs in filenames, so reruns replace the same assets and refresh metadata. It writes the new JSON snapshot only after all selected images download successfully. A failed import can leave unreferenced image files, but the current snapshot remains usable; rerun the same command to finish.

The API request timeout is 8 seconds; each image request times out after 15 seconds and is limited to 12 MB. The importer does not retry automatically. Correct transient network failures by rerunning it. No credentials or new environment variables are required.

Do not commit the complete CMA image corpus into Git. CMA documents image assets for tens of thousands of works; use managed object storage/CDN if the product later needs a larger imported collection. The current bounded snapshot is packaged with the Gateway's public assets and the Catalog service image.

## Runtime paging and ownership

- Public page: `GET /artworks/reference`; public JSON route: `GET /api/artworks/reference?page=N&limit=24`.
- Gateway calls Catalog & Discovery over internal `GET /v1/catalog/reference-artworks?page=N&limit=24` with `x-service-token`. Public reads require no login; browser code calls only the Gateway.
- Catalog & Discovery reads `services/catalog-discovery-service/src/data/cleveland-reference.json` for every requested page. It makes no CMA network request at runtime. `total` is the number of imported records in that snapshot, not the museum's full collection count.
- All artwork images use same-site JPEG paths under `/img/cma-open-access`. The browser does not load CMA image URLs, and these records are never imported into the marketplace's canonical Artist & Artwork data.
- The page size defaults to 24 and supports up to 50. The public route shape and fields remain stable. Successful Gateway pages are cached for one hour with stale-while-revalidate up to one day; errors are not cached.
- Clicking an image or title opens the local JPEG in an Atelier dialog. Only the explicitly labeled “View museum record” link leaves Atelier.

No database table, event, migration, or service-to-service write is involved. Imported reference data stays separate from canonical marketplace artwork records.
