import type { NextRequest } from "next/server";
import { CreateExhibitionBuilderPlacementRequestSchema } from "@atelier/contracts";
import { createManagedExhibitionPlacement, listExhibitionPlacements } from "@/lib/gateway/clients/exhibition.client";
import { exhibitionServiceError, requireExhibitionAccess } from "@/lib/server/exhibition-access";
import { errorResponse, json } from "@/lib/server/respond";

export async function GET(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const access = await requireExhibitionAccess(request, id);
  if (!access.ok) return access.response;
  try {
    const items = await listExhibitionPlacements(id);
    return json({ items, total: items.length });
  } catch (error) {
    return exhibitionServiceError(error);
  }
}

export async function POST(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const access = await requireExhibitionAccess(request, id);
  if (!access.ok) return access.response;
  const body = await request.json().catch(() => null);
  const parsed = CreateExhibitionBuilderPlacementRequestSchema.safeParse(body);
  if (!parsed.success) return errorResponse(parsed.error.issues[0]?.message ?? "Invalid artwork placement", 400);
  try {
    return json(await createManagedExhibitionPlacement(id, access.actor, parsed.data), 201);
  } catch (error) {
    return exhibitionServiceError(error);
  }
}
