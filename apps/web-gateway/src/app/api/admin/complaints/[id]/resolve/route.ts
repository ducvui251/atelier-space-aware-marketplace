import type { NextRequest } from "next/server";
import { resolveComplaint } from "@/lib/gateway/clients/admin.client";
import { getAuthUser, requireRole } from "@/lib/server/auth";
import { json, errorResponse } from "@/lib/server/respond";

export async function POST(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const user = await getAuthUser(request);
  const roleError = requireRole(user, ["admin"]);
  if (roleError) return errorResponse(roleError, user ? 403 : 401);
  const { id } = await params;
  const body = await request.json().catch(() => null);
  if (body?.status !== "resolved" && body?.status !== "rejected") return errorResponse("status must be 'resolved' or 'rejected'", 400);
  try { return json(await resolveComplaint(id, { status: body.status, note: body.note })); }
  catch { return errorResponse("Complaint could not be resolved", 409); }
}
