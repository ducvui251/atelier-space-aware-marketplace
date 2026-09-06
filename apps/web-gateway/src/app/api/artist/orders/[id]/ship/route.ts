import type { NextRequest } from "next/server";
import { shipOrder } from "@/lib/gateway/clients/orders.client";
import { getAuthUser, requireRole } from "@/lib/server/auth";
import { json, errorResponse } from "@/lib/server/respond";

export async function POST(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const user = await getAuthUser(request);
  const roleError = requireRole(user, ["artist"]);
  if (roleError) return errorResponse(roleError, user ? 403 : 401);
  const body = await request.json().catch(() => null);
  const { id } = await params;
  try { return json(await shipOrder(id, user!.artistId ?? "", body ?? {})); }
  catch { return errorResponse("Order could not be shipped", 409); }
}
