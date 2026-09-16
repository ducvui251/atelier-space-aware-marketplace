import type { NextRequest } from "next/server";
import { listArtistArtworks, createArtwork } from "@/lib/gateway/clients/artwork.client";
import { getAuthUser, requireRole } from "@/lib/server/auth";
import { json, errorResponse } from "@/lib/server/respond";
import { ServiceClientError } from "@/lib/gateway/http-client";

export async function GET(request: NextRequest) {
  const user = await getAuthUser(request);
  const roleError = requireRole(user, ["artist"]);
  if (roleError) return errorResponse(roleError, user ? 403 : 401);
  const searchParams = request.nextUrl.searchParams;
  const page = searchParams.get("page");
  const limit = searchParams.get("limit");
  const result = await listArtistArtworks(user!.artistId ?? "", {
    page: page ? Number(page) : undefined,
    limit: limit ? Number(limit) : undefined,
    q: searchParams.get("q") ?? undefined,
  });
  return json({ items: result.items, total: result.total });
}

export async function POST(request: NextRequest) {
  const user = await getAuthUser(request);
  const roleError = requireRole(user, ["artist"]);
  if (roleError) return errorResponse(roleError, user ? 403 : 401);
  const body = await request.json().catch(() => null);
  if (!body || typeof body !== "object") return errorResponse("A JSON body is required", 400);
  try { return json(await createArtwork({ ...(body as Record<string, unknown>), artistId: user!.artistId }), 201); }
  catch (error) {
    if (error instanceof ServiceClientError && (error.status === 403 || error.status === 400)) {
      return errorResponse(error.message, error.status);
    }
    return errorResponse("Artwork could not be created", 409);
  }
}
