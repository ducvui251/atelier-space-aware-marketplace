import type { NextRequest } from "next/server";
import { getServerDb, setServerDb } from "@/lib/server/store";
import { getAuthUser, requireRole } from "@/lib/server/auth";
import { json, errorResponse } from "@/lib/server/respond";

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const user = getAuthUser(request);
  const roleError = requireRole(user, ["admin"]);
  if (roleError) return errorResponse(roleError, user ? 403 : 401);

  const { id } = await params;
  const body = await request.json().catch(() => null);
  if (body?.status !== "verified" && body?.status !== "rejected") {
    return errorResponse("status must be 'verified' or 'rejected'", 400);
  }
  if (body.status === "rejected" && !String(body?.note ?? "").trim()) {
    return errorResponse("note is required when rejecting", 400);
  }

  const db = getServerDb();
  if (!db.artworks.some((a) => a.id === id)) return errorResponse("Artwork not found", 404);

  const artworks = db.artworks.map((a) =>
    a.id === id
      ? {
          ...a,
          verificationStatus: body.status,
          verificationNote: body.note,
          reviewedAt: new Date().toISOString(),
          reviewedBy: user!.id,
        }
      : a,
  );
  setServerDb({ ...db, artworks });
  return json(artworks.find((a) => a.id === id));
}
