import { createServiceServer, getPort, readJson, writeServiceError, writeServiceJson, type ServiceRouteHandler } from "@atelier/config/http";
import { ArtistVerificationReviewRequestSchema, ArtworkVerificationReviewRequestSchema, parseBody } from "@atelier/contracts";
import { ping } from "@atelier/persistence";
import { health } from "./health.ts";
import { reviewArtist, reviewArtwork } from "./infrastructure/verification-repository.ts";

const routes: Record<string, ServiceRouteHandler> = {
  "POST /v1/verification/artworks/:id/review": async ({ request, url, response, correlationId }) => {
    const parsed = parseBody(ArtworkVerificationReviewRequestSchema, await readJson(request));
    if (!parsed.success) return writeServiceError(response, 400, { code: parsed.code, message: parsed.message, correlationId, field: parsed.field, retryable: false });
    const result = await reviewArtwork({ artworkId: url.pathname.split("/")[4] ?? "", ...parsed.data });
    return result ? writeServiceJson(response, 200, result, correlationId) : writeServiceError(response, 404, { code: "NOT_FOUND", message: "Artwork not found", correlationId, retryable: false });
  },
  "POST /v1/verification/artists/:id/review": async ({ request, url, response, correlationId }) => {
    const parsed = parseBody(ArtistVerificationReviewRequestSchema, await readJson(request));
    if (!parsed.success) return writeServiceError(response, 400, { code: parsed.code, message: parsed.message, correlationId, field: parsed.field, retryable: false });
    const result = await reviewArtist({ artistId: url.pathname.split("/")[4] ?? "", ...parsed.data });
    return result ? writeServiceJson(response, 200, result, correlationId) : writeServiceError(response, 404, { code: "NOT_FOUND", message: "Artist not found", correlationId, retryable: false });
  },
};

async function ready() {
  const database = (await ping()) ? ("ok" as const) : ("unavailable" as const);
  return { status: database, dependencies: { database } };
}

createServiceServer({ name: "verification", version: "v1", port: getPort("VERIFICATION_PORT", 4106), health, ready, routes, internalToken: process.env.ATELIER_INTERNAL_SERVICE_TOKEN }).listen(getPort("VERIFICATION_PORT", 4106));
