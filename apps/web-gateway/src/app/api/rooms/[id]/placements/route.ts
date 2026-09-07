import type { NextRequest } from "next/server";
import { createPlacement } from "@/lib/gateway/clients/room-preview.client";
import { getAuthUser } from "@/lib/server/auth";
import { json, errorResponse } from "@/lib/server/respond";

export async function POST(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const user = await getAuthUser(request);
  if (!user) return errorResponse("Unauthorized", 401);

  const { id } = await params;
  const body = await request.json().catch(() => null);
  const artworkId = typeof body?.artworkId === "string" ? body.artworkId : "";
  if (!artworkId) return errorResponse("artworkId is required", 400);

  try {
    const placement = await createPlacement(id, {
      buyerId: user.id,
      artworkId,
      scale: typeof body.scale === "number" ? body.scale : undefined,
      positionX: typeof body.positionX === "number" ? body.positionX : undefined,
      positionY: typeof body.positionY === "number" ? body.positionY : undefined,
      rotation: typeof body.rotation === "number" ? body.rotation : undefined,
    });
    return json(placement, 201);
  } catch {
    return errorResponse("Room not found", 404);
  }
}
