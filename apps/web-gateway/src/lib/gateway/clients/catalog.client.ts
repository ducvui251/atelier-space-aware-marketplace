import type { Collection } from "@atelier/contracts";
import { requestService } from "../http-client";

export async function listCollections(): Promise<Collection[]> {
  return (await requestService<{ items: Collection[]; total: number }>("catalog-discovery", "/v1/catalog/collections")).items;
}
