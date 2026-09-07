import type { NextRequest } from "next/server";
import { ArtworkSearchQuerySchema } from "@atelier/contracts";
import { requestService } from "@/lib/gateway/http-client";
import { json } from "@/lib/server/respond";

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const parsed = ArtworkSearchQuerySchema.safeParse(Object.fromEntries(searchParams.entries()));
  const query = parsed.success ? `?${new URLSearchParams(Object.entries(parsed.data).filter((entry): entry is [string, string] => entry[1] !== undefined))}` : "";
  const result = await requestService<{ items: unknown[]; total: number }>("catalog-discovery", `/v1/catalog/artworks${query}`);
  return json(result);
}
