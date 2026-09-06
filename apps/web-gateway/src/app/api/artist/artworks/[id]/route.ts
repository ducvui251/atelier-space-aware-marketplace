import type { NextRequest } from "next/server";
import { findArtwork, updateArtwork } from "@/lib/gateway/clients/artwork.client";
import { getAuthUser, requireRole } from "@/lib/server/auth";
import { json, errorResponse } from "@/lib/server/respond";

export async function PATCH(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const user = await getAuthUser(request);
  const roleError = requireRole(user, ["artist"]);
  if (roleError) return errorResponse(roleError, user ? 403 : 401);
  const { id } = await params;
  const existing = await findArtwork(id);
  if (!existing) return errorResponse("Artwork not found", 404);
  if (existing.artistId !== user!.artistId) return errorResponse("Forbidden", 403);
  const body = await request.json().catch(() => null);
  if (!body || typeof body !== "object") return errorResponse("A JSON body is required", 400);
  try { return json(await updateArtwork(id, body as Record<string, unknown>)); }
  catch { return errorResponse("Artwork could not be updated", 409); }
}
