import type { Exhibition, ExhibitionPlacement } from "@atelier/contracts";
import { requestService } from "../http-client";

interface ListResponse<T> {
  items: T[];
  total: number;
}

export async function findExhibitionBySlug(slug: string): Promise<Exhibition | null> {
  const result = await requestService<ListResponse<Exhibition>>(
    "room-preview",
    `/v1/room-preview/exhibitions?slug=${encodeURIComponent(slug)}`,
  );
  return result.items[0] ?? null;
}

export async function listExhibitionPlacements(exhibitionId: string): Promise<ExhibitionPlacement[]> {
  const result = await requestService<ListResponse<ExhibitionPlacement>>(
    "room-preview",
    `/v1/room-preview/exhibitions/${encodeURIComponent(exhibitionId)}/placements`,
  );
  return result.items;
}
