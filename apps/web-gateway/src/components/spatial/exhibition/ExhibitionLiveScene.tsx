"use client";

import { useState } from "react";
import type { Artwork, ExhibitionPlacement, ExhibitionSceneDoor, ExhibitionSceneImagePlacement, ExhibitionSceneStyle, SceneWall } from "@atelier/contracts";
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
  wallSegments?: SceneWall[];
  doors?: ExhibitionSceneDoor[];
  style?: ExhibitionSceneStyle;
  imagePlacements?: ExhibitionSceneImagePlacement[];
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
  wallSegments,
  doors,
  style,
  imagePlacements,
  placedArtworks,
  onLockChange,
  onArtworkSelect,
  paused = false,
}: ExhibitionLiveSceneProps) {
  const [isLocked, setIsLocked] = useState(false);
  const [openDoorIds, setOpenDoorIds] = useState<Set<string>>(() => new Set());

  function toggleDoor(doorId: string) {
    setOpenDoorIds((current) => {
      const next = new Set(current);
      if (next.has(doorId)) next.delete(doorId);
      else next.add(doorId);
      return next;
    });
  }

  const handleLockChange = (locked: boolean) => {
    setIsLocked(locked);
    onLockChange?.(locked);
  };

  return (
    <>
      {style ? <color attach="background" args={[style.environmentColor]} /> : null}
      <Lighting templateId={roomTemplateId} style={style} />
      <PointerLockControls
        onLock={() => handleLockChange(true)}
        onUnlock={() => handleLockChange(false)}
      />

      <Player paused={paused} roomWidth={roomWidth} roomDepth={roomDepth} wallSegments={wallSegments} doors={doors} openDoorIds={openDoorIds} />

      <RoomEnvironment
        templateId={roomTemplateId}
        width={roomWidth}
        depth={roomDepth}
        wallColor={wallColor}
        wallSegments={wallSegments}
        doors={doors}
        openDoorIds={openDoorIds}
        onDoorToggle={toggleDoor}
        doorInteractionsEnabled={!paused}
        style={style}
      />

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
      {imagePlacements?.map((image) => (
        <ArtworkMesh
          key={`uploaded-${image.id}`}
          position={[image.positionX, image.positionY, image.positionZ]}
          rotationY={(image.rotationY * DEGREES_TO_RADIANS)}
          widthMeters={image.widthMeters}
          heightMeters={image.heightMeters}
          imageUrl={image.imageUrl}
          frameColor="#2a2622"
        />
      ))}
    </>
  );
}
