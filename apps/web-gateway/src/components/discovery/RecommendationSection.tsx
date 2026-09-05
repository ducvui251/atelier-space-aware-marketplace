"use client";

import { useAppState } from "@/lib/store/hooks";
import { getGatewayRecommendations } from "@/lib/gateway/clients/recommendation.client";
import { ArtworkGrid } from "@/components/artwork/ArtworkGrid";

export function RecommendationSection() {
  const { db, currentUser } = useAppState();
  const { items, reason } = getGatewayRecommendations(db, currentUser?.id ?? null);

  if (items.length === 0) return null;

  return (
    <div>
      <p className="eyebrow mb-1">
        {reason === "personalized" ? "Vì bạn đã lưu tác phẩm tương tự" : "Curated for you"}
      </p>
      <h2 className="mb-6 font-display text-h2 text-foreground">Có thể bạn sẽ thích</h2>
      <ArtworkGrid artworks={items} columns={3} />
    </div>
  );
}
