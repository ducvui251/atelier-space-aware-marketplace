import type { NextRequest } from "next/server";
import { createComplaint } from "@/lib/gateway/clients/admin.client";
import { getAuthUser } from "@/lib/server/auth";
import { json, errorResponse } from "@/lib/server/respond";

export async function POST(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const user = await getAuthUser(request);
  if (!user) return errorResponse("Unauthorized", 401);
  const { id } = await params;
  const body = await request.json().catch(() => null);
  const reason = typeof body?.reason === "string" ? body.reason.trim() : "";
  if (!reason) return errorResponse("reason is required", 400);
  try { return json(await createComplaint({ reporterId: user.id, orderId: id, reason, evidenceUrl: typeof body.evidenceUrl === "string" ? body.evidenceUrl : undefined }), 201); }
  catch { return errorResponse("Complaint could not be created", 409); }
}
