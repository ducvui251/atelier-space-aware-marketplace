"use client";

import { useState } from "react";
import { X } from "lucide-react";
import type { Artwork, SceneWall } from "@atelier/contracts";
import { SpatialCanvas } from "./SpatialCanvas";
import { ExhibitionLiveScene, type PlacedArtwork } from "./exhibition/ExhibitionLiveScene";
import { ArtworkDetailSheet } from "./exhibition/ArtworkDetailSheet";
import { Button } from "@/components/ui/button";

interface ExhibitionViewerProps {
  title: string;
  roomTemplateId?: string;
  roomWidth?: number;
  roomDepth?: number;
  wallColor?: string;
  wallSegments?: SceneWall[];
  placedArtworks: PlacedArtwork[];
  onExit: () => void;
}

export function ExhibitionViewer({ title, roomTemplateId, roomWidth, roomDepth, wallColor, wallSegments, placedArtworks, onExit }: ExhibitionViewerProps) {
  const [locked, setLocked] = useState(false);
  const [selectedArtwork, setSelectedArtwork] = useState<Artwork | null>(null);

  return (
    <div className="relative h-full w-full overflow-hidden bg-background">
      <SpatialCanvas cameraPosition={[0, 1.6, 2.5]}>
        <ExhibitionLiveScene
          roomTemplateId={roomTemplateId}
          roomWidth={roomWidth}
          roomDepth={roomDepth}
          wallColor={wallColor}
          wallSegments={wallSegments}
          placedArtworks={placedArtworks}
          onLockChange={setLocked}
          onArtworkSelect={setSelectedArtwork}
          paused={selectedArtwork !== null}
        />
      </SpatialCanvas>

      <div className="pointer-events-none absolute inset-x-0 top-0 flex items-start justify-between p-4">
        <div className="pointer-events-auto flex items-center gap-3 rounded-md border border-border bg-surface/95 px-4 py-2 shadow-sm">
          <p className="text-body-sm font-medium text-foreground">{title}</p>
          <span className="text-caption text-muted-foreground">
            {placedArtworks.length} {placedArtworks.length === 1 ? "artwork" : "artworks"}
          </span>
        </div>
        <Button variant="outline" size="sm" onClick={onExit} className="pointer-events-auto">
          <X /> Exit
        </Button>
      </div>

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
