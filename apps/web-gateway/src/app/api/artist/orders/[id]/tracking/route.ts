import type { NextRequest } from "next/server";
import { getOrderTrackingAsArtist } from "@/lib/gateway/clients/orders.client";
import { getAuthUser, requireRole } from "@/lib/server/auth";
import { json, errorResponse } from "@/lib/server/respond";
import { ServiceClientError } from "@/lib/gateway/http-client";

export async function GET(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const user = await getAuthUser(request);
  const roleError = requireRole(user, ["artist"]);
  if (roleError) return errorResponse(roleError, user ? 403 : 401);
  const { id } = await params;
  try {
    return json(await getOrderTrackingAsArtist(id, user!.artistId ?? ""));
  } catch (error) {
    if (error instanceof ServiceClientError && error.status === 404) {
      return errorResponse("Tracking status unavailable", 404);
    }
    return errorResponse("Could not load tracking status", 502);
  }
}
