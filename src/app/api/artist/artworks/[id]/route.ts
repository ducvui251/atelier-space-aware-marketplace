import type { NextRequest } from "next/server";
import { getServerDb, setServerDb } from "@/lib/server/store";
import { getAuthUser, requireRole } from "@/lib/server/auth";
import { json, errorResponse } from "@/lib/server/respond";

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const user = getAuthUser(request);
  const roleError = requireRole(user, ["artist"]);
  if (roleError) return errorResponse(roleError, user ? 403 : 401);

  const { id } = await params;
  const db = getServerDb();
  const existing = db.artworks.find((a) => a.id === id && a.artistId === user!.artistId);
  if (!existing) return errorResponse("Artwork not found", 404);

  const body = await request.json().catch(() => null);
  if (body?.title !== undefined && !String(body.title).trim()) {
    return errorResponse("title cannot be empty", 400);
  }
  if (body?.price !== undefined && !(Number(body.price) > 0)) {
    return errorResponse("price must be > 0", 400);
  }

  const updated = {
    ...existing,
    ...body,
    id: existing.id,
    artistId: existing.artistId,
    artist: existing.artist,
    verificationStatus: "pending" as const,
    verificationNote: undefined,
    reviewedAt: undefined,
    reviewedBy: undefined,
  };

  setServerDb({
    ...db,
    artworks: db.artworks.map((a) => (a.id === id ? updated : a)),
  });
  return json(updated);
}
