"use client";

import { useState } from "react";
import type { Artwork } from "@atelier/contracts";
import { SpatialCanvas } from "./SpatialCanvas";
import { ExhibitionScene } from "./exhibition/ExhibitionScene";

interface ExhibitionDemoSceneProps {
  artworks?: Artwork[];
}

export function ExhibitionDemoScene({ artworks = [] }: ExhibitionDemoSceneProps) {
  const [locked, setLocked] = useState(false);

  return (
    <div className="relative h-[70vh] w-full overflow-hidden rounded-lg border border-border">
      <SpatialCanvas cameraPosition={[0, 1.6, 2.5]}>
        <ExhibitionScene onLockChange={setLocked} artworks={artworks} />
      </SpatialCanvas>
      {!locked ? (
        <div className="pointer-events-none absolute inset-0 flex items-center justify-center bg-background/40">
          <div className="rounded-md border border-border bg-surface px-4 py-3 text-center shadow-sm">
            <p className="text-body-sm font-medium text-foreground">Click to look around</p>
            <p className="mt-1 text-caption text-muted-foreground">WASD to move · Esc to exit</p>
          </div>
        </div>
      ) : null}
    </div>
  );
}
