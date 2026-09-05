"use client";

import Link from "next/link";
import { Heart } from "lucide-react";
import { ArtworkGrid } from "@/components/artwork/ArtworkGrid";
import { EmptyState } from "@/components/ui/empty-state";
import { Button } from "@/components/ui/button";
import { RecommendationSection } from "@/components/discovery/RecommendationSection";
import { useSaved } from "@/lib/store/hooks";

export function SavedView() {
  const { items } = useSaved();

  return (
    <>
      <p className="eyebrow">Your collection</p>
      <h1 className="mt-2 font-display text-h1 text-foreground">Saved</h1>
      <p className="mt-4 max-w-xl text-body text-muted-foreground">
        Artworks you have set aside, saved on this device.
      </p>

      <div className="mt-10">
        {items.length > 0 ? (
          <ArtworkGrid artworks={items} columns={3} />
        ) : (
          <EmptyState
            icon={Heart}
            title="Nothing saved yet"
            description="Tap the heart on any artwork to keep it here while you decide."
            action={
              <Button variant="outline" asChild>
                <Link href="/artworks">Explore artworks</Link>
              </Button>
            }
          />
        )}
      </div>

      <div className="mt-16 border-t border-border pt-10">
        <RecommendationSection />
      </div>
    </>
  );
}
