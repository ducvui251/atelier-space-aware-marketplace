import type { Exhibition } from "@atelier/contracts";
import type { NextRequest } from "next/server";
import { findExhibitionById, type ExhibitionActor } from "@/lib/gateway/clients/exhibition.client";
import { ServiceClientError } from "@/lib/gateway/http-client";
import { getAuthUser, requireRole } from "@/lib/server/auth";
import { errorResponse } from "@/lib/server/respond";

type ActorResult =
  | { ok: true; actor: ExhibitionActor }
  | { ok: false; response: Response };

export async function requireExhibitionActor(request: NextRequest | Request): Promise<ActorResult> {
  const user = await getAuthUser(request);
  const roleError = requireRole(user, ["artist", "admin"]);
  if (roleError) return { ok: false, response: errorResponse(roleError, user ? 403 : 401) };

  if (user!.role === "artist" && !user!.artistId) {
    return { ok: false, response: errorResponse("An artist profile is required to build exhibitions", 403) };
  }

  return {
    ok: true,
    actor: { id: user!.role === "artist" ? user!.artistId! : user!.id, role: user!.role as "artist" | "admin" },
  };
}

export type ExhibitionAccessResult =
  | { ok: true; actor: ExhibitionActor; exhibition: Exhibition }
  | { ok: false; response: Response };

export async function requireExhibitionAccess(request: NextRequest | Request, exhibitionId: string): Promise<ExhibitionAccessResult> {
  const actorResult = await requireExhibitionActor(request);
  if (!actorResult.ok) return actorResult;

  try {
    const exhibition = await findExhibitionById(exhibitionId);
    if (!exhibition) return { ok: false, response: errorResponse("Exhibition not found", 404) };
    const canManage = actorResult.actor.role === "admin"
      || (exhibition.creatorType === "artist" && exhibition.creatorId === actorResult.actor.id);
    if (!canManage) return { ok: false, response: errorResponse("You do not have permission to edit this exhibition", 403) };
    return { ok: true, actor: actorResult.actor, exhibition };
  } catch (error) {
    return { ok: false, response: exhibitionServiceError(error) };
  }
}

export function exhibitionServiceError(error: unknown): Response {
  if (error instanceof ServiceClientError) {
    if ([400, 403, 404, 409].includes(error.status)) return errorResponse(error.message, error.status);
    return errorResponse("Exhibition service unavailable", 503);
  }
  return errorResponse("Exhibition service unavailable", 503);
}
