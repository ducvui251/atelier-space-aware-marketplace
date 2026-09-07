import type { NextRequest } from "next/server";
import { deletePlacement } from "@/lib/gateway/clients/room-preview.client";
import { getAuthUser } from "@/lib/server/auth";
import { json, errorResponse } from "@/lib/server/respond";

export async function DELETE(request: NextRequest, { params }: { params: Promise<{ id: string; placementId: string }> }) {
  const user = await getAuthUser(request);
  if (!user) return errorResponse("Unauthorized", 401);

  const { id, placementId } = await params;
  const result = await deletePlacement(id, placementId, user.id);
  return result.removed ? json(result) : errorResponse("Placement not found", 404);
}
