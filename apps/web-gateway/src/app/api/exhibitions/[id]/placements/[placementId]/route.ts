import type { NextRequest } from "next/server";
import { UpdateExhibitionPlacementRequestSchema } from "@atelier/contracts";
import { deleteManagedExhibitionPlacement, updateManagedExhibitionPlacement } from "@/lib/gateway/clients/exhibition.client";
import { exhibitionServiceError, requireExhibitionAccess } from "@/lib/server/exhibition-access";
import { errorResponse, json } from "@/lib/server/respond";

interface Params {
  params: Promise<{ id: string; placementId: string }>;
}

export async function PATCH(request: NextRequest, { params }: Params) {
  const { id, placementId } = await params;
  const access = await requireExhibitionAccess(request, id);
  if (!access.ok) return access.response;
  const body = await request.json().catch(() => null);
  const parsed = UpdateExhibitionPlacementRequestSchema.omit({ requesterId: true, requesterRole: true }).safeParse(body);
  if (!parsed.success) return errorResponse(parsed.error.issues[0]?.message ?? "Invalid artwork placement", 400);
  try {
    return json(await updateManagedExhibitionPlacement(id, placementId, access.actor, parsed.data));
  } catch (error) {
    return exhibitionServiceError(error);
  }
}

export async function DELETE(request: NextRequest, { params }: Params) {
  const { id, placementId } = await params;
  const access = await requireExhibitionAccess(request, id);
  if (!access.ok) return access.response;
  try {
    const result = await deleteManagedExhibitionPlacement(id, placementId, access.actor);
    return result.removed ? json(result) : errorResponse("Placement not found", 404);
  } catch (error) {
    return exhibitionServiceError(error);
  }
}
