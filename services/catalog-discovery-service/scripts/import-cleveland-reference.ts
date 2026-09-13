import { mkdir, writeFile } from "node:fs/promises";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { PublicDomainArtworkPageQuerySchema, PublicDomainArtworkSchema, type PublicDomainArtwork } from "@atelier/contracts";
import { fetchPublicDomainArtworkPage } from "../src/infrastructure/cleveland-source.ts";

const DEFAULT_LIMIT = 48;
const MAX_LIMIT = 100;
const UPSTREAM_PAGE_SIZE = 50;
const IMAGE_MAX_BYTES = 12 * 1024 * 1024;
const IMAGE_TIMEOUT_MS = 15_000;
const IMPORT_CONCURRENCY = 4;
const REPOSITORY_ROOT = resolve(dirname(fileURLToPath(import.meta.url)), "../../..");
const SNAPSHOT_PATH = join(REPOSITORY_ROOT, "services/catalog-discovery-service/src/data/cleveland-reference.json");
const IMAGE_DIRECTORY = join(REPOSITORY_ROOT, "apps/web-gateway/public/img/cma-open-access");

function requestedLimit(arguments_: string[]): number {
  const option = arguments_.find((value) => value.startsWith("--limit="));
  const separateOptionIndex = arguments_.indexOf("--limit");
  const value = option?.slice("--limit=".length)
    ?? (separateOptionIndex >= 0 ? arguments_[separateOptionIndex + 1] : undefined);
  const limit = value === undefined ? DEFAULT_LIMIT : Number(value);
  if (!Number.isSafeInteger(limit) || limit < 1 || limit > MAX_LIMIT) {
    throw new Error(`--limit must be an integer from 1 to ${MAX_LIMIT}`);
  }
  return limit;
}

async function downloadImage(url: string, destination: string): Promise<void> {
  const response = await fetch(url, { signal: AbortSignal.timeout(IMAGE_TIMEOUT_MS) });
  if (!response.ok) throw new Error(`CMA image download returned HTTP ${response.status}`);
  if (!response.headers.get("content-type")?.toLowerCase().startsWith("image/jpeg")) {
    throw new Error("CMA web image did not return image/jpeg");
  }
  const declaredLength = Number(response.headers.get("content-length") ?? 0);
  if (declaredLength > IMAGE_MAX_BYTES) throw new Error("CMA web image exceeds the 12 MB import limit");
  const bytes = Buffer.from(await response.arrayBuffer());
  if (bytes.length === 0 || bytes.length > IMAGE_MAX_BYTES) {
    throw new Error("CMA web image is empty or exceeds the 12 MB import limit");
  }
  await writeFile(destination, bytes);
}

async function main(): Promise<void> {
  const limit = requestedLimit(process.argv.slice(2));
  const upstreamItems: PublicDomainArtwork[] = [];
  let sourceTotal = 0;
  let page = 1;

  while (upstreamItems.length < limit) {
    const query = PublicDomainArtworkPageQuerySchema.parse({ page, limit: UPSTREAM_PAGE_SIZE });
    const response = await fetchPublicDomainArtworkPage(query);
    sourceTotal = response.total;
    const remaining = limit - upstreamItems.length;
    upstreamItems.push(...response.items.slice(0, remaining));
    if (response.items.length === 0 || page >= response.totalPages) break;
    page += 1;
  }

  if (upstreamItems.length === 0) throw new Error("CMA returned no CC0 artworks with images");
  const ids = new Set(upstreamItems.map((item) => item.id));
  if (ids.size !== upstreamItems.length) throw new Error("CMA returned duplicate artwork IDs across pages");

  await mkdir(IMAGE_DIRECTORY, { recursive: true });
  for (let start = 0; start < upstreamItems.length; start += IMPORT_CONCURRENCY) {
    const batch = upstreamItems.slice(start, start + IMPORT_CONCURRENCY);
    await Promise.all(batch.map(async (artwork) => {
      const filename = `${artwork.id}_web.jpg`;
      const imagePath = `/img/cma-open-access/${filename}`;
      await downloadImage(artwork.imageUrl, join(IMAGE_DIRECTORY, filename));
      artwork.imageUrl = imagePath;
      artwork.imageFullUrl = imagePath;
      PublicDomainArtworkSchema.parse(artwork);
    }));
  }

  const snapshot = {
    version: 1,
    source: "Cleveland Museum of Art Open Access",
    license: "CC0",
    importedAt: new Date().toISOString(),
    sourceTotal,
    items: upstreamItems,
  };
  await mkdir(dirname(SNAPSHOT_PATH), { recursive: true });
  await writeFile(SNAPSHOT_PATH, `${JSON.stringify(snapshot, null, 2)}\n`, "utf8");
  console.info(`Imported ${upstreamItems.length} CC0 records and local JPEGs (CMA currently reports ${sourceTotal} matches).`);
  console.info(`Snapshot: ${SNAPSHOT_PATH}`);
}

main().catch((error: unknown) => {
  console.error(error instanceof Error ? error.message : "CMA reference import failed");
  process.exitCode = 1;
});
