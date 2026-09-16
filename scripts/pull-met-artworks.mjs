// Pulls real paintings (title, artist, medium, dimensions, image) from the
// Metropolitan Museum of Art Open Access API (no API key required, CC0
// license) and creates them as new artworks via artist-artwork-service's
// internal HTTP API, to enrich the marketplace with real art data instead
// of synthetic mock data.
//
// Uses the real POST /v1/artist-artwork/artworks + PATCH .../verification
// endpoints (not raw SQL) so the write goes through the normal creation
// path and publishes the ArtworkPublished outbox event that keeps
// catalog-discovery-service's read model (the one the public /artworks
// catalog actually queries, see artwork.client.ts's searchCatalogArtworks)
// in sync. A first attempt inserted rows directly via SQL; those never
// appeared in the catalog because no event was published — do not repeat
// that mistake.
//
// The Met API has no `price` field (museum collection, not for sale), so a
// price is assigned locally using the tiered logic documented in
// scripts/artwork-price-tiers.txt (see pickPrice() below).
//
// Usage: node scripts/pull-met-artworks.mjs [count]
// Requires: artist-artwork-service running and reachable (default
// http://localhost:4103), and ATELIER_INTERNAL_SERVICE_TOKEN set (read
// from .env if present).
import { readFileSync, existsSync, writeFileSync } from "node:fs";
import { execFileSync } from "node:child_process";

// Tracks Met object IDs already imported across runs (persisted locally, not
// committed) so re-running the script with a higher count pulls NEW
// paintings instead of re-fetching/duplicating the same ones.
const IMPORTED_IDS_FILE = new URL("../.met-imported-ids.json", import.meta.url);
function loadImportedIds() {
  if (!existsSync(IMPORTED_IDS_FILE)) return new Set();
  return new Set(JSON.parse(readFileSync(IMPORTED_IDS_FILE, "utf8")));
}
function saveImportedIds(set) {
  writeFileSync(IMPORTED_IDS_FILE, JSON.stringify([...set]));
}

// The object-id file alone is not a reliable dedupe source: an earlier run
// crashed before per-item persistence was added and created 50 artworks
// whose object IDs were never recorded, so re-running against the id file
// alone would recreate them a third time. image_url is exactly what this
// script writes into artwork_images and is unique per Met object (the
// "web-large" rendition path embeds the object's own asset filename), so
// checking the live DB for it catches duplicates the id file misses.
function loadExistingImageUrls() {
  const out = execFileSync(
    "docker",
    [
      "exec",
      process.env.POSTGRES_CONTAINER ?? "datn-postgres-1",
      "psql",
      "-U",
      process.env.POSTGRES_USER ?? "atelier",
      "-d",
      process.env.POSTGRES_DB ?? "atelier",
      "-t",
      "-A",
      "-c",
      "select image_url from artist_artwork.artwork_images where image_url like 'https://images.metmuseum.org/%';",
    ],
    { encoding: "utf8" },
  );
  return new Set(out.split("\n").map((s) => s.trim()).filter(Boolean));
}

function loadServiceToken() {
  if (process.env.ATELIER_INTERNAL_SERVICE_TOKEN) return process.env.ATELIER_INTERNAL_SERVICE_TOKEN;
  const env = readFileSync(new URL("../.env", import.meta.url), "utf8");
  const match = env.match(/^ATELIER_INTERNAL_SERVICE_TOKEN=(.+)$/m);
  if (!match) throw new Error("ATELIER_INTERNAL_SERVICE_TOKEN not found in .env");
  return match[1].trim();
}

const SERVICE_URL = process.env.ARTIST_ARTWORK_URL ?? "http://localhost:4103";
const SERVICE_TOKEN = loadServiceToken();
const TARGET_COUNT = Number(process.argv[2] ?? 20);

// The 3 artist profiles seeded by every fresh migration run
// (0002_seed_catalog.sql) — the only ids guaranteed to exist on a brand new
// clone. Do not hardcode session-specific artist ids here: a fresh database
// won't have them, and artist_artwork.artworks.artist_id is a real foreign
// key, so createArtwork would just fail (caught and skipped per-object,
// but wastes a chunk of every run's attempts).
const ARTIST_IDS = [
  "00000000-0000-4000-8000-000000000001", // Lena Moreau
  "00000000-0000-4000-8000-000000000002", // Aki Tanaka
  "00000000-0000-4000-8000-000000000003", // Maria Wood
];

// Tiered pricing logic (documented in scripts/artwork-price-tiers.txt).
function pickPrice(medium, isHighlight) {
  const m = (medium ?? "").toLowerCase();
  let [min, max] = [300, 1000]; // default tier
  if (isHighlight && m.includes("oil")) [min, max] = [3000, 8000];
  else if (m.includes("oil") || m.includes("acrylic")) [min, max] = [1200, 3000];
  else if (m.includes("watercolor") || m.includes("tempera") || m.includes("gouache")) [min, max] = [500, 1200];
  else if (["drawing", "print", "engraving", "etching", "lithograph", "pastel", "charcoal", "ink"].some((k) => m.includes(k)))
    [min, max] = [150, 500];
  const raw = min + Math.random() * (max - min);
  return Math.round(raw / 10) * 10;
}

function pickOrientation(widthCm, heightCm) {
  if (Math.abs(widthCm - heightCm) < 2) return "square";
  return heightCm > widthCm ? "portrait" : "landscape";
}

function parseYear(objectDate) {
  const match = /\d{4}/.exec(objectDate ?? "");
  return match ? Number(match[0]) : undefined;
}

function extractDimensionsCm(measurements) {
  const overall = measurements?.find((m) => m.elementName === "Overall") ?? measurements?.[0];
  const w = overall?.elementMeasurements?.Width;
  const h = overall?.elementMeasurements?.Height;
  if (typeof w === "number" && typeof h === "number" && w > 0 && h > 0) return { widthCm: w, heightCm: h };
  return null;
}

// Met's API sits behind Imperva Incapsula bot-protection: hammering it
// (e.g. one request every 120ms for hundreds of requests) gets the whole
// IP blocked — every subsequent request, including unrelated ones like the
// search endpoint, silently returns 403 with an Incapsula `visid_incap_*`
// cookie. A first bulk-pull run treated "response not ok" as "skip this
// object" and kept looping through 4000+ candidates for ~10 minutes doing
// nothing once blocked, because 403 never threw. BlockedError makes that
// state fail loud instead: it's thrown out of fetchJson, deliberately NOT
// retried by withRetry (retrying into an active block just makes it
// worse/longer), and the top-level loop aborts the whole run on it instead
// of burning through the rest of the candidate list for no result.
class BlockedError extends Error {}

async function fetchJson(url) {
  const res = await fetch(url);
  if (res.status === 403 || res.status === 429) {
    throw new BlockedError(`Met API returned ${res.status} for ${url} — likely bot-blocked (Incapsula). Stop and retry later.`);
  }
  if (!res.ok) throw new Error(`request failed: ${res.status} ${url}`);
  return res.json();
}

async function searchObjectIds() {
  const data = await fetchJson("https://collectionapi.metmuseum.org/public/collection/v1/search?medium=Paintings&hasImages=true&q=painting");
  return data.objectIDs ?? [];
}

// Bulk pulls (thousands of objects) hit occasional transient network
// failures (DNS/connect timeouts) against the free public API — retry a
// few times with backoff instead of letting one hiccup kill a long run.
// BlockedError is deliberately NOT retried here (see above) — it propagates
// straight up so the caller can abort instead of digging the block deeper.
async function withRetry(fn, attempts = 4) {
  for (let i = 0; i < attempts; i++) {
    try {
      return await fn();
    } catch (err) {
      if (err instanceof BlockedError) throw err;
      if (i === attempts - 1) throw err;
      await new Promise((r) => setTimeout(r, 500 * (i + 1)));
    }
  }
}

async function fetchObject(id) {
  return withRetry(() => fetchJson(`https://collectionapi.metmuseum.org/public/collection/v1/objects/${id}`));
}

async function createArtwork(body) {
  const res = await withRetry(() =>
    fetch(`${SERVICE_URL}/v1/artist-artwork/artworks`, {
      method: "POST",
      headers: { "Content-Type": "application/json", "x-service-token": SERVICE_TOKEN },
      body: JSON.stringify(body),
    }),
  );
  if (!res.ok) throw new Error(`createArtwork failed: ${res.status} ${await res.text()}`);
  return res.json();
}

async function verifyArtwork(id) {
  const res = await withRetry(() =>
    fetch(`${SERVICE_URL}/v1/artist-artwork/artworks/${id}/verification`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json", "x-service-token": SERVICE_TOKEN },
      body: JSON.stringify({ status: "verified", note: "Auto-verified: real artwork sourced from The Met Open Access API" }),
    }),
  );
  if (!res.ok) throw new Error(`verifyArtwork failed: ${res.status} ${await res.text()}`);
  return res.json();
}

async function main() {
  const ids = await searchObjectIds();
  console.log(`Met search returned ${ids.length} candidate object IDs.`);

  const importedIds = loadImportedIds();
  const existingImageUrls = loadExistingImageUrls();
  console.log(`Found ${existingImageUrls.size} Met images already in the database (deduped against these too).`);
  let inserted = 0;
  let scanned = 0;
  let artistCursor = 0;
  let consecutiveFailures = 0;

  for (const id of ids) {
    if (inserted >= TARGET_COUNT) break;
    if (importedIds.has(id)) continue;

    scanned += 1;
    let obj;
    try {
      obj = await fetchObject(id);
      consecutiveFailures = 0;
    } catch (err) {
      if (err instanceof BlockedError) {
        console.error(`ABORTING: ${err.message}`);
        console.error(`Created ${inserted} artworks before the block. Wait a while (Incapsula blocks are usually temporary) and re-run — already-imported objects are skipped automatically.`);
        break;
      }
      consecutiveFailures += 1;
      console.warn(`skipped object ${id}: ${err.message}`);
      if (consecutiveFailures >= 8) {
        console.error(`ABORTING: ${consecutiveFailures} consecutive object fetches failed — the API is likely unreachable or blocking us even without a 403.`);
        break;
      }
      continue;
    }
    // Be polite to the free public API (no key, shared rate limit) — a much
    // longer gap than the 120ms used in the first run, which triggered an
    // Incapsula bot-protection block after a few hundred requests.
    await new Promise((r) => setTimeout(r, 1500));

    // web-large is a much smaller, fast-loading rendition than the
    // multi-megabyte "original" primaryImage — the original consistently
    // hit Next.js's 7s image-optimization timeout (500 error) when fetched
    // from inside the Docker network.
    const imageUrl = obj?.primaryImageSmall;
    if (!obj || !imageUrl || !obj.isPublicDomain) continue;
    if (existingImageUrls.has(imageUrl)) {
      importedIds.add(id); // fill in the id-file gap so future runs skip it via the cheaper id check
      continue;
    }
    const dims = extractDimensionsCm(obj.measurements);
    if (!dims) continue; // skip artworks without parseable physical dimensions

    const title = obj.title?.trim() || "Untitled";
    const artistDisplay = obj.artistDisplayName?.trim() || "Unknown Artist";
    // artist_artwork.artworks.medium is varchar(100) — the Met API's medium
    // field is free text and some entries (mounted scrolls, multi-material
    // pieces) run well past that, which Postgres rejects as an unhandled
    // 500 instead of a clean validation error. Truncate client-side.
    const medium = (obj.medium?.trim() || "Mixed media").slice(0, 100);
    const year = parseYear(obj.objectDate);
    const price = pickPrice(medium, Boolean(obj.isHighlight));
    const orientation = pickOrientation(dims.widthCm, dims.heightCm);
    const artistId = ARTIST_IDS[artistCursor % ARTIST_IDS.length];
    artistCursor += 1;

    const description = `${artistDisplay} — ${obj.objectDate ?? "date unknown"}. Sourced from The Metropolitan Museum of Art Open Access collection (public domain).`;

    // A single object's failure (after its own retries) must not kill a
    // run that's meant to process thousands of objects unattended.
    try {
      const created = await createArtwork({
        artistId,
        title,
        description,
        medium,
        imageUrl,
        price,
        widthCm: dims.widthCm,
        heightCm: dims.heightCm,
        year,
        orientation,
      });
      importedIds.add(id); // mark used even if verification below fails, so we never double-create this object
      existingImageUrls.add(imageUrl);
      saveImportedIds(importedIds);
      await verifyArtwork(created.id);
      inserted += 1;
      console.log(`[${inserted}/${TARGET_COUNT}] ${title} (${medium}) — $${price} — ${orientation}`);
    } catch (err) {
      console.warn(`skipped object ${id} (${title}): ${err.message}`);
    }
  }

  console.log(`Done. Scanned ${scanned} new candidates, created and verified ${inserted} real artworks from the Met Open Access API.`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
