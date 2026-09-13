// Pulls real paintings from the Cleveland Museum of Art Open Access API (no
// key required, CC0) as a replacement source for
// scripts/pull-aic-artworks.mjs, which had to be abandoned: the Art
// Institute of Chicago's image CDN (www.artic.edu/iiif/*) sits behind a
// Cloudflare bot-protection *interactive challenge* ("Attention Required!"),
// not a simple rate limit — confirmed to block even a real browser, not
// just server-side fetches, so there is no viewer for whom those images
// would ever load. That source's already-created artworks were rejected
// (see the artwork_images.image_url pattern for artic.edu) rather than left
// showing broken images in the catalog.
//
// This CDN (openaccess-cdn.clevelandart.org) is already in
// apps/web-gateway/next.config.ts's image remotePatterns and already used
// for the built-in Cleveland reference-collection feature, so it is a
// known-good, already-proven host for this project.
//
// Duplicates the small helper set (pricing tiers, orientation, year
// parsing, retry/BlockedError, create+verify against the real internal
// API) from pull-met-artworks.mjs / pull-aic-artworks.mjs rather than
// importing from either — see those files' header comments for why each
// piece exists (outbox events over raw SQL, image_url-based dedupe,
// abort-on-block).
//
// Usage: node scripts/pull-cma-artworks.mjs [count]
// Requires: artist-artwork-service running and reachable (default
// http://localhost:4103), and ATELIER_INTERNAL_SERVICE_TOKEN set (read
// from .env if present).
import { readFileSync, existsSync, writeFileSync } from "node:fs";
import { execFileSync } from "node:child_process";

const IMPORTED_IDS_FILE = new URL("../.cma-imported-ids.json", import.meta.url);
function loadImportedIds() {
  if (!existsSync(IMPORTED_IDS_FILE)) return new Set();
  return new Set(JSON.parse(readFileSync(IMPORTED_IDS_FILE, "utf8")));
}
function saveImportedIds(set) {
  writeFileSync(IMPORTED_IDS_FILE, JSON.stringify([...set]));
}

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
      "select image_url from artist_artwork.artwork_images where image_url like 'https://openaccess-cdn.clevelandart.org/%';",
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
const PAGE_SIZE = 100;

const ARTIST_IDS = [
  "00000000-0000-4000-8000-000000000001", // Lena Moreau
  "00000000-0000-4000-8000-000000000002", // Aki Tanaka
  "00000000-0000-4000-8000-000000000003", // Maria Wood
  "4e57c3ec-b60f-4e52-b547-f46cffb3d397", // Demo Artist
  "ecfd7970-cb75-4ebc-aea2-310d11d53e1d", // Vu tong
];

// Tiered pricing logic (documented in scripts/artwork-price-tiers.txt).
function pickPrice(medium, isHighlight) {
  const m = (medium ?? "").toLowerCase();
  let [min, max] = [300, 1000];
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

function parseYear(creationDate) {
  const matches = [...(creationDate ?? "").matchAll(/\d{4}/g)];
  return matches.length ? Number(matches[matches.length - 1][0]) : undefined;
}

// `measurements` is free text, e.g. "Framed: 90.5 x 78 x 6.5 cm (...);
// Unframed: 76.2 x 64.8 cm (...)" — prefer the Unframed pair (the artwork
// itself, not the frame); fall back to the first "W x H cm" pair found for
// records with no "Unframed:" section.
function extractDimensionsCm(measurements) {
  const text = measurements ?? "";
  const unframed = /Unframed:\s*(\d+(?:\.\d+)?)\s*x\s*(\d+(?:\.\d+)?)\s*cm/i.exec(text);
  const match = unframed ?? /(\d+(?:\.\d+)?)\s*x\s*(\d+(?:\.\d+)?)\s*cm/i.exec(text);
  if (!match) return null;
  const widthCm = Number(match[1]);
  const heightCm = Number(match[2]);
  if (!(widthCm > 0 && heightCm > 0)) return null;
  return { widthCm, heightCm };
}

class BlockedError extends Error {}

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

async function fetchJson(url) {
  const res = await fetch(url);
  if (res.status === 403 || res.status === 429) {
    throw new BlockedError(`Cleveland API returned ${res.status} for ${url} — likely rate-limited/blocked. Stop and retry later.`);
  }
  if (!res.ok) throw new Error(`request failed: ${res.status} ${url}`);
  return res.json();
}

async function fetchPage(skip) {
  const qs = new URLSearchParams({ type: "Painting", has_image: "1", limit: String(PAGE_SIZE), skip: String(skip) });
  return withRetry(() => fetchJson(`https://openaccess-api.clevelandart.org/api/artworks/?${qs}`));
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
      body: JSON.stringify({ status: "verified", note: "Auto-verified: real artwork sourced from the Cleveland Museum of Art Open Access API" }),
    }),
  );
  if (!res.ok) throw new Error(`verifyArtwork failed: ${res.status} ${await res.text()}`);
  return res.json();
}

async function main() {
  const importedIds = loadImportedIds();
  const existingImageUrls = loadExistingImageUrls();
  console.log(`Found ${existingImageUrls.size} Cleveland images already in the database.`);

  let inserted = 0;
  let scanned = 0;
  let artistCursor = 0;
  let skip = 0;
  let consecutiveEmptyPages = 0;

  while (inserted < TARGET_COUNT) {
    let body;
    try {
      body = await fetchPage(skip);
    } catch (err) {
      if (err instanceof BlockedError) {
        console.error(`ABORTING: ${err.message}`);
        console.error(`Created ${inserted} artworks before the block. Re-run later — already-imported objects are skipped automatically.`);
        break;
      }
      console.error(`ABORTING: page at skip=${skip} fetch failed after retries: ${err.message}`);
      break;
    }
    const items = body.data ?? [];
    if (items.length === 0) {
      console.log("No more results from Cleveland — exhausted the collection for this query.");
      break;
    }

    let createdThisPage = 0;
    for (const item of items) {
      if (inserted >= TARGET_COUNT) break;
      if (importedIds.has(item.id)) continue;
      scanned += 1;

      const imageUrl = item.images?.web?.url;
      if (item.share_license_status !== "CC0" || !imageUrl) continue;
      if (existingImageUrls.has(imageUrl)) {
        importedIds.add(item.id);
        continue;
      }
      const dims = extractDimensionsCm(item.measurements);
      if (!dims) continue;

      const title = item.title?.trim() || "Untitled";
      const artistDisplay = item.creators?.[0]?.description?.trim() || "Unknown Artist";
      const medium = item.technique?.trim() || "Mixed media";
      const year = parseYear(item.creation_date);
      const price = pickPrice(medium, Boolean(item.is_highlight));
      const orientation = pickOrientation(dims.widthCm, dims.heightCm);
      const artistId = ARTIST_IDS[artistCursor % ARTIST_IDS.length];
      artistCursor += 1;

      const description = `${artistDisplay} — ${item.creation_date ?? "date unknown"}. Sourced from the Cleveland Museum of Art Open Access collection (CC0).`;

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
        importedIds.add(item.id);
        existingImageUrls.add(imageUrl);
        saveImportedIds(importedIds);
        await verifyArtwork(created.id);
        inserted += 1;
        createdThisPage += 1;
        console.log(`[${inserted}/${TARGET_COUNT}] ${title} (${medium}) — $${price} — ${orientation}`);
      } catch (err) {
        console.warn(`skipped Cleveland object ${item.id} (${title}): ${err.message}`);
      }
    }

    consecutiveEmptyPages = createdThisPage === 0 ? consecutiveEmptyPages + 1 : 0;
    if (consecutiveEmptyPages >= 15) {
      console.error("ABORTING: 15 consecutive pages produced nothing new — likely exhausted the usable subset of this query.");
      break;
    }

    skip += PAGE_SIZE;
    // Learned from the AIC block: start conservative even though this is a
    // different host, rather than repeat the same bursty-traffic mistake.
    await new Promise((r) => setTimeout(r, 2000));
  }

  console.log(`Done. Scanned ${scanned} new candidates, created and verified ${inserted} real artworks from the Cleveland Museum of Art.`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
