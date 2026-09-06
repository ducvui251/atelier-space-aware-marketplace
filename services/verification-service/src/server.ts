import { createServiceServer, getPort, readJson, writeServiceJson, type ServiceRouteHandler } from "@atelier/config/http";
import { health } from "./health.ts";
import { reviewArtist, reviewArtwork } from "./infrastructure/verification-repository.ts";

const routes: Record<string, ServiceRouteHandler> = {
  "POST /v1/verification/artworks/:id/review": async ({ request, url, response, correlationId }) => {
    const body = await readJson<{ reviewerAuthUserId?: string; status?: "verified" | "rejected"; note?: string; coaUrl?: string }>(request);
    if (!body?.reviewerAuthUserId || (body.status !== "verified" && body.status !== "rejected")) return writeServiceJson(response, 400, { error: "reviewerAuthUserId and a valid status are required" }, correlationId);
    if (body.status === "rejected" && !body.note?.trim()) return writeServiceJson(response, 400, { error: "note is required when rejecting" }, correlationId);
    const result = await reviewArtwork({ artworkId: url.pathname.split("/")[4] ?? "", reviewerAuthUserId: body.reviewerAuthUserId, status: body.status, note: body.note, coaUrl: body.coaUrl });
    return result ? writeServiceJson(response, 200, result, correlationId) : writeServiceJson(response, 404, { error: "Artwork not found" }, correlationId);
  },
  "POST /v1/verification/artists/:id/review": async ({ request, url, response, correlationId }) => {
    const body = await readJson<{ status?: "verified" | "rejected"; note?: string }>(request);
    if (body?.status !== "verified" && body?.status !== "rejected") return writeServiceJson(response, 400, { error: "status is required" }, correlationId);
    if (body.status === "rejected" && !body.note?.trim()) return writeServiceJson(response, 400, { error: "note is required when rejecting" }, correlationId);
    const result = await reviewArtist({ artistId: url.pathname.split("/")[4] ?? "", status: body.status, note: body.note });
    return result ? writeServiceJson(response, 200, result, correlationId) : writeServiceJson(response, 404, { error: "Artist not found" }, correlationId);
  },
};

createServiceServer({ name: "verification", version: "v1", port: getPort("VERIFICATION_PORT", 4106), health, routes, internalToken: process.env.ATELIER_INTERNAL_SERVICE_TOKEN }).listen(getPort("VERIFICATION_PORT", 4106));
