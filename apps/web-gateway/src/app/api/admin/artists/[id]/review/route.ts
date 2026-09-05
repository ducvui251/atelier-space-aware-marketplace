import type { NextRequest } from "next/server";
import { getServerDb, setServerDb } from "@/lib/gateway/runtime";
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
  if (!db.artists.some((a) => a.id === id)) return errorResponse("Artist not found", 404);

  const artists = db.artists.map((a) =>
    a.id === id
      ? { ...a, verificationStatus: body.status, verificationNote: body.note, reviewedAt: new Date().toISOString() }
      : a,
  );
  setServerDb({ ...db, artists });
  return json(artists.find((a) => a.id === id));
}
