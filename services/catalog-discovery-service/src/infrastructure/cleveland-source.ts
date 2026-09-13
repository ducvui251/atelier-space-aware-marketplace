import type { PublicDomainArtworkPageQuery, PublicDomainArtworkPageResponse } from "@atelier/contracts";
import { PublicDomainArtworkPageResponseSchema } from "@atelier/contracts";
import { z } from "zod";

const CLEVELAND_ARTWORKS_URL = "https://openaccess-api.clevelandart.org/api/artworks/";
const CLEVELAND_TIMEOUT_MS = 8_000;
const IMAGE_HOST = "openaccess-cdn.clevelandart.org";
const MUSEUM_HOSTS = new Set(["clevelandart.org", "www.clevelandart.org"]);
const ARTWORK_FIELDS = [
  "id",
  "share_license_status",
  "title",
  "creation_date",
  "creators",
  "technique",
  "measurements",
  "images",
  "url",
].join(",");

const ImageAssetSchema = z.object({ url: z.string().nullish() }).nullish();

const ClevelandResponseSchema = z.object({
  info: z.object({ total: z.number().int().nonnegative() }),
  data: z.array(z.object({
    id: z.number().int().positive(),
    share_license_status: z.string(),
    title: z.string().nullish(),
    creation_date: z.union([z.string(), z.number()]).nullish(),
    creators: z.array(z.object({
      description: z.string().nullish(),
      role: z.string().nullish(),
    })).nullish(),
    technique: z.string().nullish(),
    measurements: z.string().nullish(),
    images: z.object({
      web: ImageAssetSchema,
      print: ImageAssetSchema,
    }).nullish(),
    url: z.string().url(),
  })),
});

export class ClevelandMuseumUpstreamError extends Error {
  readonly status: 502 | 503 | 504;
  readonly code: "UPSTREAM_INVALID_RESPONSE" | "UPSTREAM_UNAVAILABLE" | "UPSTREAM_TIMEOUT";
  readonly retryable: boolean;

  constructor(
    message: string,
    status: 502 | 503 | 504,
    code: "UPSTREAM_INVALID_RESPONSE" | "UPSTREAM_UNAVAILABLE" | "UPSTREAM_TIMEOUT",
    retryable: boolean,
  ) {
    super(message);
    this.name = "ClevelandMuseumUpstreamError";
    this.status = status;
    this.code = code;
    this.retryable = retryable;
  }
}

function invalidResponse(message: string): ClevelandMuseumUpstreamError {
  return new ClevelandMuseumUpstreamError(message, 502, "UPSTREAM_INVALID_RESPONSE", false);
}

function makeRequestUrl(query: PublicDomainArtworkPageQuery): URL {
  const url = new URL(CLEVELAND_ARTWORKS_URL);
  url.searchParams.set("has_image", "1");
  url.searchParams.set("skip", String((query.page - 1) * query.limit));
  url.searchParams.set("limit", String(query.limit));
  url.searchParams.set("fields", ARTWORK_FIELDS);
  url.searchParams.set("cc0", "");
  return url;
}

function validateMuseumUrl(value: string, allowedHosts: Set<string>, description: string): string {
  let url: URL;
  try {
    url = new URL(value);
  } catch {
    throw invalidResponse("Cleveland Museum returned an invalid " + description + " URL");
  }

  if (
    url.protocol !== "https:" ||
    !allowedHosts.has(url.hostname) ||
    url.username !== "" ||
    url.password !== ""
  ) {
    throw invalidResponse("Cleveland Museum returned an unsupported " + description + " URL");
  }
  return url.toString();
}

function buildArtwork(record: z.infer<typeof ClevelandResponseSchema>["data"][number]) {
  if (record.share_license_status !== "CC0") {
    throw invalidResponse("Cleveland Museum returned a non-CC0 artwork");
  }

  const webImage = record.images?.web?.url;
  if (!webImage) throw invalidResponse("Cleveland Museum artwork did not include a web image");
  const imageUrl = validateMuseumUrl(webImage, new Set([IMAGE_HOST]), "image");
  const imageFullUrl = validateMuseumUrl(record.images?.print?.url || webImage, new Set([IMAGE_HOST]), "full image");
  const sourceUrl = validateMuseumUrl(record.url, MUSEUM_HOSTS, "artwork");
  const creators = record.creators ?? [];
  const artistCreators = creators.filter((creator) => creator.role?.toLowerCase() === "artist");
  const creatorNames = (artistCreators.length > 0 ? artistCreators : creators)
    .map((creator) => creator.description?.trim())
    .filter((name): name is string => Boolean(name));
  const title = record.title?.trim() || "Untitled work";
  const creationDate = record.creation_date;

  return {
    id: record.id,
    title,
    artistName: creatorNames.join("; ") || "Artist not recorded",
    dateDisplay: String(creationDate ?? "").trim() || "Date not recorded",
    mediumDisplay: record.technique?.trim() || "Medium not recorded",
    dimensions: record.measurements?.trim() || "Dimensions not recorded",
    imageUrl,
    imageFullUrl,
    imageAltText: title,
    sourceUrl,
  };
}

export async function fetchPublicDomainArtworkPage(
  query: PublicDomainArtworkPageQuery,
  fetcher: typeof fetch = fetch,
): Promise<PublicDomainArtworkPageResponse> {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), CLEVELAND_TIMEOUT_MS);

  try {
    let response: Response;
    try {
      response = await fetcher(makeRequestUrl(query), {
        headers: { accept: "application/json", "user-agent": "Atelier art-discovery" },
        signal: controller.signal,
      });
    } catch {
      if (controller.signal.aborted) {
        throw new ClevelandMuseumUpstreamError("Cleveland Museum request timed out", 504, "UPSTREAM_TIMEOUT", true);
      }
      throw new ClevelandMuseumUpstreamError("Cleveland Museum is unavailable", 503, "UPSTREAM_UNAVAILABLE", true);
    }

    if (!response.ok) {
      if (response.status === 429 || response.status >= 500) {
        throw new ClevelandMuseumUpstreamError("Cleveland Museum is temporarily unavailable", 503, "UPSTREAM_UNAVAILABLE", true);
      }
      throw invalidResponse("Cleveland Museum returned an unexpected response");
    }

    let payload: unknown;
    try {
      payload = await response.json();
    } catch {
      if (controller.signal.aborted) {
        throw new ClevelandMuseumUpstreamError("Cleveland Museum request timed out", 504, "UPSTREAM_TIMEOUT", true);
      }
      throw invalidResponse("Cleveland Museum returned invalid JSON");
    }

    const parsed = ClevelandResponseSchema.safeParse(payload);
    if (!parsed.success) throw invalidResponse("Cleveland Museum response did not match its contract");

    const { data, info } = parsed.data;
    const totalPages = Math.ceil(info.total / query.limit);
    const page = {
      items: data.map(buildArtwork),
      page: query.page,
      limit: query.limit,
      total: info.total,
      totalPages,
      hasPreviousPage: query.page > 1,
      hasNextPage: query.page < totalPages,
    };
    const validated = PublicDomainArtworkPageResponseSchema.safeParse(page);
    if (!validated.success) throw invalidResponse("Mapped Cleveland Museum page did not match its contract");
    return validated.data;
  } finally {
    clearTimeout(timeout);
  }
}
