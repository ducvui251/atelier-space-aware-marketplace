import { createServiceServer, getPort, readJson, writeServiceJson, type ServiceRouteHandler } from "@atelier/config/http";
import { health } from "./health.ts";
import { createComplaint, getStats, listComplaints, resolveComplaint } from "./infrastructure/admin-repository.ts";

async function source<T>(path: string): Promise<T> {
  const baseUrl = process.env.ARTIST_ARTWORK_SERVICE_URL ?? "http://localhost:4103";
  const response = await fetch(`${baseUrl.replace(/\/$/, "")}${path}`, { headers: process.env.ATELIER_INTERNAL_SERVICE_TOKEN ? { "x-service-token": process.env.ATELIER_INTERNAL_SERVICE_TOKEN } : {} });
  if (!response.ok) throw new Error(`Artist artwork service returned ${response.status}`);
  return response.json() as Promise<T>;
}

const routes: Record<string, ServiceRouteHandler> = {
  "GET /v1/admin/verification-queue": async ({ response, correlationId }) => {
    const [artists, artworks] = await Promise.all([source<{ items: Array<{ verificationStatus: string }> }>("/v1/artist-artwork/artists"), source<{ items: Array<{ verificationStatus: string }> }>("/v1/artist-artwork/artworks")]);
    return writeServiceJson(response, 200, { artists: artists.items.filter((item) => item.verificationStatus === "pending"), artworks: artworks.items.filter((item) => item.verificationStatus === "pending") }, correlationId);
  },
  "GET /v1/admin/stats": async ({ response, correlationId }) => writeServiceJson(response, 200, await getStats(), correlationId),
  "GET /v1/admin/complaints": async ({ response, correlationId }) => { const items = await listComplaints(); return writeServiceJson(response, 200, { items, total: items.length }, correlationId); },
  "POST /v1/admin/complaints": async ({ request, response, correlationId }) => {
    const body = await readJson<{ reporterId?: string; orderId?: string; reason?: string; evidenceUrl?: string }>(request);
    if (!body?.reporterId || !body.orderId || !body.reason?.trim()) return writeServiceJson(response, 400, { error: "reporterId, orderId, and reason are required" }, correlationId);
    return writeServiceJson(response, 201, await createComplaint({ authUserId: body.reporterId, orderId: body.orderId, reason: body.reason.trim(), evidenceUrl: body.evidenceUrl }), correlationId);
  },
  "POST /v1/admin/complaints/:id/resolve": async ({ request, url, response, correlationId }) => {
    const body = await readJson<{ status?: "resolved" | "rejected"; note?: string }>(request);
    if (body?.status !== "resolved" && body?.status !== "rejected") return writeServiceJson(response, 400, { error: "status must be resolved or rejected" }, correlationId);
    const complaint = await resolveComplaint(url.pathname.split("/")[4] ?? "", body.status, body.note);
    return complaint ? writeServiceJson(response, 200, complaint, correlationId) : writeServiceJson(response, 404, { error: "Complaint not found" }, correlationId);
  },
};

createServiceServer({ name: "admin", version: "v1", port: getPort("ADMIN_PORT", 4108), health, routes, internalToken: process.env.ATELIER_INTERNAL_SERVICE_TOKEN }).listen(getPort("ADMIN_PORT", 4108));
