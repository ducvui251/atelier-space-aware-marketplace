import type { NextRequest } from "next/server";
import { reviewArtwork } from "@/lib/gateway/clients/verification.client";
import { getAuthUser, requireRole } from "@/lib/server/auth";
import { json, errorResponse } from "@/lib/server/respond";

export async function POST(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const user = await getAuthUser(request);
  const roleError = requireRole(user, ["admin"]);
  if (roleError) return errorResponse(roleError, user ? 403 : 401);
  const body = await request.json().catch(() => null);
  if (body?.status !== "verified" && body?.status !== "rejected") return errorResponse("status must be 'verified' or 'rejected'", 400);
  if (body.status === "rejected" && !String(body.note ?? "").trim()) return errorResponse("note is required when rejecting", 400);
  const { id } = await params;
  try { return json(await reviewArtwork(id, { ...body, reviewerAuthUserId: user!.id })); }
  catch { return errorResponse("Artwork verification failed", 409); }
}
