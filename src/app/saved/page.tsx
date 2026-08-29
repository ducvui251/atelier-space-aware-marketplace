import type { Metadata } from "next";
import Link from "next/link";
import { Heart } from "lucide-react";
import { PageContainer } from "@/components/layout/PageContainer";
import { ArtworkGrid } from "@/components/artwork/ArtworkGrid";
import { EmptyState } from "@/components/ui/empty-state";
import { Button } from "@/components/ui/button";
import { getArtworks } from "@/features/artworks/services/artwork.service";

export const metadata: Metadata = {
  title: "Saved",
  description: "Artworks you have saved for later.",
};

export default async function SavedPage() {
  const saved = (await getArtworks()).slice(0, 6);

  return (
    <PageContainer className="py-10">
      <p className="eyebrow">Your collection</p>
      <h1 className="mt-2 font-display text-h1 text-foreground">Saved</h1>
      <p className="mt-4 max-w-xl text-body text-muted-foreground">
        Artworks you have set aside. Persistence arrives in a later step.
      </p>

      <div className="mt-10">
        <ArtworkGrid artworks={saved} columns={3} />
      </div>

      <div className="mt-16">
        <p className="eyebrow mb-6">Empty state preview</p>
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
      </div>
    </PageContainer>
  );
}
