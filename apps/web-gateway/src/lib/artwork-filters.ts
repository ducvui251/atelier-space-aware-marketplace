export interface ArtworkFilterQuery {
  q?: string;
  style?: string;
  color?: string;
  orientation?: string;
  edition?: string;
  availability?: string;
  price?: string;
}

export const PRICE_BUCKETS: { value: string; label: string; minPrice?: number; maxPrice?: number }[] = [
  { value: "under-700", label: "Under $700", maxPrice: 700 },
  { value: "700-1200", label: "$700 – $1,200", minPrice: 700, maxPrice: 1200 },
  { value: "over-1200", label: "Over $1,200", minPrice: 1200 },
];

/** Shared by the server page (building the catalog-discovery query) and the
 * client filter UI (rendering the bucket options) — must not live in a
 * "use client" module, since a Server Component can't call a function
 * exported from one. */
export function priceBucketToRange(bucket?: string): { minPrice?: number; maxPrice?: number } {
  const match = PRICE_BUCKETS.find((b) => b.value === bucket);
  return match ? { minPrice: match.minPrice, maxPrice: match.maxPrice } : {};
}
