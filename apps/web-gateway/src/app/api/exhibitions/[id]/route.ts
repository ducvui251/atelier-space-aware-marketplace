import type { NextRequest } from "next/server";
import { UpdateExhibitionBuilderRequestSchema } from "@atelier/contracts";
import { updateManagedExhibition } from "@/lib/gateway/clients/exhibition.client";
import { exhibitionServiceError, requireExhibitionAccess } from "@/lib/server/exhibition-access";
import { errorResponse, json } from "@/lib/server/respond";

export async function GET(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const access = await requireExhibitionAccess(request, id);
  return access.ok ? json(access.exhibition) : access.response;
}

export async function PATCH(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const access = await requireExhibitionAccess(request, id);
  if (!access.ok) return access.response;
  const body = await request.json().catch(() => null);
  const parsed = UpdateExhibitionBuilderRequestSchema.safeParse(body);
  if (!parsed.success) return errorResponse(parsed.error.issues[0]?.message ?? "Invalid exhibition details", 400);
  if (access.actor.role === "artist" && parsed.data.featured !== undefined) {
    return errorResponse("Only admins can feature exhibitions", 403);
  }
  try {
    return json(await updateManagedExhibition(id, access.actor, parsed.data));
  } catch (error) {
    return exhibitionServiceError(error);
  }
}
