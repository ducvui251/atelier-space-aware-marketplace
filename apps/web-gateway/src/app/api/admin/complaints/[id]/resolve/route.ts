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
  if (body?.status !== "resolved" && body?.status !== "rejected") {
    return errorResponse("status must be 'resolved' or 'rejected'", 400);
  }

  const db = getServerDb();
  if (!db.complaints.some((c) => c.id === id)) return errorResponse("Complaint not found", 404);

  const complaints = db.complaints.map((c) =>
    c.id === id ? { ...c, status: body.status, resolutionNote: body.note } : c,
  );
  setServerDb({ ...db, complaints });
  return json(complaints.find((c) => c.id === id));
}
