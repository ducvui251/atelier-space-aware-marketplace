import type { NextRequest } from "next/server";
import { listArtistArtworks, createArtwork } from "@/lib/gateway/clients/artwork.client";
import { getAuthUser, requireRole } from "@/lib/server/auth";
import { json, errorResponse } from "@/lib/server/respond";

export async function GET(request: NextRequest) {
  const user = await getAuthUser(request);
  const roleError = requireRole(user, ["artist"]);
  if (roleError) return errorResponse(roleError, user ? 403 : 401);
  const result = await listArtistArtworks(user!.artistId ?? "");
  return json({ items: result.items, total: result.total ?? result.items.length });
}

export async function POST(request: NextRequest) {
  const user = await getAuthUser(request);
  const roleError = requireRole(user, ["artist"]);
  if (roleError) return errorResponse(roleError, user ? 403 : 401);
  const body = await request.json().catch(() => null);
  if (!body || typeof body !== "object") return errorResponse("A JSON body is required", 400);
  try { return json(await createArtwork({ ...(body as Record<string, unknown>), artistId: user!.artistId }), 201); }
  catch { return errorResponse("Artwork could not be created", 409); }
}
