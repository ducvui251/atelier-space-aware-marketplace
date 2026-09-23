"use client";

import { useState } from "react";
import type { Exhibition } from "@atelier/contracts";
import { PageContainer } from "@/components/layout/PageContainer";
import { ArtworkImage } from "@/components/artwork/ArtworkImage";
import { Button } from "@/components/ui/button";
import { ExhibitionViewerLoader } from "@/components/spatial/ExhibitionViewerLoader";
import type { PlacedArtwork } from "@/components/spatial/exhibition/ExhibitionLiveScene";
import { displayableImageUrl } from "@/lib/image-hosts";

interface ExhibitionLandingClientProps {
  exhibition: Exhibition;
  creatorName: string;
  placedArtworks: PlacedArtwork[];
}

export function ExhibitionLandingClient({ exhibition, creatorName, placedArtworks }: ExhibitionLandingClientProps) {
  const [entered, setEntered] = useState(false);
  const previewImageUrl = displayableImageUrl(placedArtworks[0]?.artwork.imageUrl ?? exhibition.scene?.imagePlacements?.[0]?.imageUrl);
  const artworkCount = placedArtworks.length + (exhibition.scene?.imagePlacements?.length ?? 0);
  const activeLevel = exhibition.scene?.levels.find((level) => level.id === exhibition.scene?.activeLevelId) ?? exhibition.scene?.levels[0];
  const sceneWalls = activeLevel
    ? exhibition.scene?.walls
        .filter((wall) => wall.levelId === activeLevel.id)
        .map(({ levelId: _levelId, ...wall }) => wall)
    : undefined;
  const wallSegments = sceneWalls?.length ? sceneWalls : exhibition.wallSegments;
  const sceneDoors = activeLevel
    ? exhibition.scene?.doors?.filter((door) => door.levelId === activeLevel.id)
    : undefined;
  const roomWidth = activeLevel?.floor.width ?? exhibition.roomWidth;
  const roomDepth = activeLevel?.floor.depth ?? exhibition.roomDepth;

  if (entered) {
    return (
      <div className="fixed inset-0 z-40">
        <ExhibitionViewerLoader
          title={exhibition.title}
          roomTemplateId={exhibition.roomTemplateId}
          roomWidth={roomWidth}
          roomDepth={roomDepth}
          wallColor={exhibition.wallColor}
          wallSegments={wallSegments}
          doors={sceneDoors}
          style={exhibition.scene?.style}
          imagePlacements={exhibition.scene?.imagePlacements}
          placedArtworks={placedArtworks}
          onExit={() => setEntered(false)}
        />
      </div>
    );
  }

  return (
    <PageContainer className="py-10">
      <div className="grid gap-8 md:grid-cols-2 md:items-center">
        <div>
          <p className="eyebrow">Curated by {creatorName}</p>
          <h1 className="mt-2 font-display text-h1 text-foreground">{exhibition.title}</h1>
          {exhibition.description ? (
            <p className="mt-3 max-w-xl text-body text-muted-foreground">{exhibition.description}</p>
          ) : null}
          <p className="mt-4 text-body-sm text-muted-foreground">
            {artworkCount} {artworkCount === 1 ? "artwork" : "artworks"}
          </p>
          <Button size="lg" className="mt-6" onClick={() => setEntered(true)}>
            Enter Exhibition
          </Button>
        </div>
        <div className="relative aspect-[4/3] overflow-hidden rounded-lg border border-border">
          <ArtworkImage src={previewImageUrl} alt={exhibition.title} fill sizes="(min-width: 768px) 50vw, 100vw" />
        </div>
      </div>
    </PageContainer>
  );
}
