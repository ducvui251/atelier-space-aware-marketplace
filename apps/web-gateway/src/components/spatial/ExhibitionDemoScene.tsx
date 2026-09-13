"use client";

import { useState } from "react";
import type { Artwork } from "@atelier/contracts";
import { SpatialCanvas } from "./SpatialCanvas";
import { ExhibitionScene } from "./exhibition/ExhibitionScene";
import { ArtworkDetailSheet } from "./exhibition/ArtworkDetailSheet";

interface ExhibitionDemoSceneProps {
  artworks?: Artwork[];
}

export function ExhibitionDemoScene({ artworks = [] }: ExhibitionDemoSceneProps) {
  const [locked, setLocked] = useState(false);
  const [selectedArtwork, setSelectedArtwork] = useState<Artwork | null>(null);

  const handleArtworkSelect = (artwork: Artwork) => {
    // Deferred a tick: the click originates on the R3F canvas, outside the
    // Sheet's DOM subtree. Setting the state synchronously lets Radix
    // Dialog's own "outside click" detector see that same originating click
    // and immediately close the panel it just opened.
    setTimeout(() => setSelectedArtwork(artwork), 0);
  };

  return (
    <div className="relative h-[70vh] w-full overflow-hidden rounded-lg border border-border">
      <SpatialCanvas cameraPosition={[0, 1.6, 2.5]}>
        <ExhibitionScene
          onLockChange={setLocked}
          artworks={artworks}
          onArtworkSelect={handleArtworkSelect}
          paused={selectedArtwork !== null}
        />
      </SpatialCanvas>

      {locked && !selectedArtwork ? (
        <div
          aria-hidden
          className="pointer-events-none absolute left-1/2 top-1/2 size-2 -translate-x-1/2 -translate-y-1/2 rounded-full border border-white/80 bg-white/40"
        />
      ) : null}

      {!locked ? (
        <div className="pointer-events-none absolute inset-0 flex items-center justify-center bg-background/40">
          <div className="rounded-md border border-border bg-surface px-4 py-3 text-center shadow-sm">
            <p className="text-body-sm font-medium text-foreground">Click to look around</p>
            <p className="mt-1 text-caption text-muted-foreground">WASD to move · Esc to exit</p>
          </div>
        </div>
      ) : null}

      <ArtworkDetailSheet artwork={selectedArtwork} onClose={() => setSelectedArtwork(null)} />
    </div>
  );
}
