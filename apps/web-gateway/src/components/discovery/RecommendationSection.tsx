"use client";

import type { Artwork } from "@/types";
import { useApiResource } from "@/lib/client/hooks";
import { ArtworkGrid } from "@/components/artwork/ArtworkGrid";

interface RecommendationsResponse {
  items: Artwork[];
  reason: "personalized" | "curated";
}

export function RecommendationSection() {
  const { data } = useApiResource<RecommendationsResponse>("/api/recommendations");
  const items = data?.items ?? [];

  if (items.length === 0) return null;

  return (
    <div>
      <p className="eyebrow mb-1">
        {data?.reason === "personalized" ? "Based on artworks you've saved" : "Curated for you"}
      </p>
      <h2 className="mb-6 font-display text-h2 text-foreground">You might also like</h2>
      <ArtworkGrid artworks={items} columns={3} />
    </div>
  );
}
