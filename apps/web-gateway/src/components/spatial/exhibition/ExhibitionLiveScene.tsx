"use client";

import { useState } from "react";
import type { Artwork, ExhibitionPlacement } from "@atelier/contracts";
import { PointerLockControls } from "@react-three/drei";
import { Lighting } from "../Lighting";
import { RoomEnvironment } from "../RoomEnvironment";
import { ArtworkMesh } from "../ArtworkMesh";
import { Player } from "./Player";

const METERS_PER_CM = 0.01;
const DEGREES_TO_RADIANS = Math.PI / 180;

export interface PlacedArtwork {
  placement: ExhibitionPlacement;
  artwork: Artwork;
}

interface ExhibitionLiveSceneProps {
  roomTemplateId?: string;
  roomWidth?: number;
  roomDepth?: number;
  wallColor?: string;
  placedArtworks: PlacedArtwork[];
  onLockChange?: (locked: boolean) => void;
  onArtworkSelect?: (artwork: Artwork) => void;
  /** Freezes WASD movement, e.g. while an artwork detail panel is open. */
  paused?: boolean;
}

/**
 * Phase 7: renders a published exhibition's real artwork placements (real
 * position/rotation/scale per ExhibitionPlacement), unlike ExhibitionScene
 * (the /exhibitions/demo spike, which uses a fixed 3-slot layout).
 */
export function ExhibitionLiveScene({
  roomTemplateId = "white-cube",
  roomWidth,
  roomDepth,
  wallColor,
  placedArtworks,
  onLockChange,
  onArtworkSelect,
  paused = false,
}: ExhibitionLiveSceneProps) {
  const [isLocked, setIsLocked] = useState(false);

  const handleLockChange = (locked: boolean) => {
    setIsLocked(locked);
    onLockChange?.(locked);
  };

  return (
    <>
      <Lighting templateId={roomTemplateId} />
      <PointerLockControls
        onLock={() => handleLockChange(true)}
        onUnlock={() => handleLockChange(false)}
      />

      <Player paused={paused} roomWidth={roomWidth} roomDepth={roomDepth} />

      <RoomEnvironment templateId={roomTemplateId} width={roomWidth} depth={roomDepth} wallColor={wallColor} />

      {placedArtworks.map(({ placement, artwork }) => (
        <ArtworkMesh
          key={placement.id}
          position={[placement.positionX, placement.positionY, placement.positionZ]}
          rotation={[
            placement.rotationX * DEGREES_TO_RADIANS,
            placement.rotationY * DEGREES_TO_RADIANS,
            placement.rotationZ * DEGREES_TO_RADIANS,
          ]}
          widthMeters={artwork.widthCm * METERS_PER_CM * placement.scale}
          heightMeters={artwork.heightCm * METERS_PER_CM * placement.scale}
          imageUrl={artwork.imageUrl}
          sold={artwork.availability !== "available"}
          onSelect={
            onArtworkSelect
              ? () => {
                  if (isLocked && !paused) onArtworkSelect(artwork);
                }
              : undefined
          }
        />
      ))}
    </>
  );
}
