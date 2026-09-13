import { readFileSync } from "node:fs";
import { z } from "zod";
import {
  PublicDomainArtworkPageQuerySchema,
  PublicDomainArtworkPageResponseSchema,
  PublicDomainArtworkSchema,
  type PublicDomainArtworkPageQuery,
  type PublicDomainArtworkPageResponse,
} from "@atelier/contracts";

const LOCAL_IMAGE_PATH = /^\/img\/cma-open-access\/\d+_web\.jpg$/;

const ClevelandSnapshotSchema = z.object({
  version: z.literal(1),
  source: z.literal("Cleveland Museum of Art Open Access"),
  license: z.literal("CC0"),
  importedAt: z.string().datetime(),
  sourceTotal: z.number().int().nonnegative(),
  items: z.array(PublicDomainArtworkSchema).refine((items) =>
    items.every((item) => LOCAL_IMAGE_PATH.test(item.imageUrl) && item.imageFullUrl === item.imageUrl),
  "Cleveland snapshot images must be stored in the local public asset directory"),
});

const snapshot = ClevelandSnapshotSchema.parse(JSON.parse(
  readFileSync(new URL("../data/cleveland-reference.json", import.meta.url), "utf8"),
));

export async function listPublicDomainArtworks(
  query: PublicDomainArtworkPageQuery,
): Promise<PublicDomainArtworkPageResponse> {
  const parsedQuery = PublicDomainArtworkPageQuerySchema.parse(query);
  const total = snapshot.items.length;
  const totalPages = Math.ceil(total / parsedQuery.limit);
  const start = (parsedQuery.page - 1) * parsedQuery.limit;

  return PublicDomainArtworkPageResponseSchema.parse({
    items: snapshot.items.slice(start, start + parsedQuery.limit),
    page: parsedQuery.page,
    limit: parsedQuery.limit,
    total,
    totalPages,
    hasPreviousPage: parsedQuery.page > 1,
    hasNextPage: parsedQuery.page < totalPages,
  });
}
