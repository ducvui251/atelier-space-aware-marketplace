import type { NextRequest } from "next/server";
import { listArtistOrders } from "@/lib/gateway/clients/orders.client";
import { getAuthUser, requireRole } from "@/lib/server/auth";
import { json, errorResponse } from "@/lib/server/respond";

export async function GET(request: NextRequest) {
  const user = await getAuthUser(request);
  const roleError = requireRole(user, ["artist"]);
  if (roleError) return errorResponse(roleError, user ? 403 : 401);
  return json(await listArtistOrders(user!.artistId ?? ""));
}
