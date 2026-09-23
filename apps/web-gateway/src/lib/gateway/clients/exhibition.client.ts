import type {
  CreateExhibitionBuilderRequest,
  CreateExhibitionPlacementRequest,
  Exhibition,
  ExhibitionPlacement,
  UpdateExhibitionBuilderRequest,
  UpdateExhibitionPlacementRequest,
} from "@atelier/contracts";
import { requestService, ServiceClientError } from "../http-client";

interface ListResponse<T> {
  items: T[];
  total: number;
}

export interface ExhibitionActor {
  id: string;
  role: "artist" | "admin";
}

export async function findExhibitionBySlug(slug: string): Promise<Exhibition | null> {
  const result = await requestService<ListResponse<Exhibition>>(
    "room-preview",
    `/v1/room-preview/exhibitions?slug=${encodeURIComponent(slug)}`,
  );
  return result.items[0] ?? null;
}

/** Published only — a creator's drafts/archived exhibitions are never public. */
export async function listPublishedExhibitionsByCreator(creatorId: string): Promise<Exhibition[]> {
  const result = await requestService<ListResponse<Exhibition>>(
    "room-preview",
    `/v1/room-preview/exhibitions?creatorId=${encodeURIComponent(creatorId)}&status=published`,
  );
  return result.items;
}

export async function listPublishedExhibitions(): Promise<Exhibition[]> {
  const result = await requestService<ListResponse<Exhibition>>(
    "room-preview",
    "/v1/room-preview/exhibitions?status=published",
  );
  return result.items;
}

export async function listExhibitionPlacements(exhibitionId: string): Promise<ExhibitionPlacement[]> {
  const result = await requestService<ListResponse<ExhibitionPlacement>>(
    "room-preview",
    `/v1/room-preview/exhibitions/${encodeURIComponent(exhibitionId)}/placements`,
  );
  return result.items;
}

export async function listManageableExhibitions(actor: ExhibitionActor): Promise<Exhibition[]> {
  const query = actor.role === "artist" ? `?creatorId=${encodeURIComponent(actor.id)}` : "";
  return (await requestService<ListResponse<Exhibition>>("room-preview", `/v1/room-preview/exhibitions${query}`)).items;
}

export async function createManagedExhibition(actor: ExhibitionActor, input: CreateExhibitionBuilderRequest): Promise<Exhibition> {
  return requestService<Exhibition>("room-preview", "/v1/room-preview/exhibitions", {
    method: "POST",
    body: { ...input, creatorType: actor.role, creatorId: actor.id },
  });
}

export async function findExhibitionById(id: string): Promise<Exhibition | null> {
  try {
    return await requestService<Exhibition>("room-preview", `/v1/room-preview/exhibitions/${encodeURIComponent(id)}`);
  } catch (error) {
    if (error instanceof ServiceClientError && error.status === 404) return null;
    throw error;
  }
}

export async function updateManagedExhibition(id: string, actor: ExhibitionActor, input: UpdateExhibitionBuilderRequest): Promise<Exhibition> {
  return requestService<Exhibition>("room-preview", `/v1/room-preview/exhibitions/${encodeURIComponent(id)}`, {
    method: "PATCH",
    body: { ...input, requesterId: actor.id, requesterRole: actor.role },
  });
}

export async function createManagedExhibitionPlacement(
  id: string,
  actor: ExhibitionActor,
  input: Omit<CreateExhibitionPlacementRequest, "requesterId" | "requesterRole">,
): Promise<ExhibitionPlacement> {
  return requestService<ExhibitionPlacement>("room-preview", `/v1/room-preview/exhibitions/${encodeURIComponent(id)}/placements`, {
    method: "POST",
    body: { ...input, requesterId: actor.id, requesterRole: actor.role },
  });
}

export async function updateManagedExhibitionPlacement(
  id: string,
  placementId: string,
  actor: ExhibitionActor,
  input: Omit<UpdateExhibitionPlacementRequest, "requesterId" | "requesterRole">,
): Promise<ExhibitionPlacement> {
  return requestService<ExhibitionPlacement>(
    "room-preview",
    `/v1/room-preview/exhibitions/${encodeURIComponent(id)}/placements/${encodeURIComponent(placementId)}`,
    { method: "PATCH", body: { ...input, requesterId: actor.id, requesterRole: actor.role } },
  );
}

export async function deleteManagedExhibitionPlacement(id: string, placementId: string, actor: ExhibitionActor): Promise<{ removed: boolean }> {
  const query = new URLSearchParams({ requesterId: actor.id, requesterRole: actor.role });
  return requestService<{ removed: boolean }>(
    "room-preview",
    `/v1/room-preview/exhibitions/${encodeURIComponent(id)}/placements/${encodeURIComponent(placementId)}?${query}`,
    { method: "DELETE" },
  );
}
