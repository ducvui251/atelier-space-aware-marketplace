import type { NextRequest } from "next/server";
import { CreateExhibitionBuilderRequestSchema } from "@atelier/contracts";
import { createManagedExhibition, listManageableExhibitions } from "@/lib/gateway/clients/exhibition.client";
import { exhibitionServiceError, requireExhibitionActor } from "@/lib/server/exhibition-access";
import { errorResponse, json } from "@/lib/server/respond";

export async function GET(request: NextRequest) {
  const access = await requireExhibitionActor(request);
  if (!access.ok) return access.response;
  try {
    const items = await listManageableExhibitions(access.actor);
    return json({ items, total: items.length });
  } catch (error) {
    return exhibitionServiceError(error);
  }
}

export async function POST(request: NextRequest) {
  const access = await requireExhibitionActor(request);
  if (!access.ok) return access.response;
  const body = await request.json().catch(() => null);
  const parsed = CreateExhibitionBuilderRequestSchema.safeParse(body);
  if (!parsed.success) return errorResponse(parsed.error.issues[0]?.message ?? "Invalid exhibition details", 400);
  try {
    return json(await createManagedExhibition(access.actor, parsed.data), 201);
  } catch (error) {
    return exhibitionServiceError(error);
  }
}
