"use client";

import { useState } from "react";
import type { Artwork } from "@atelier/contracts";
import { PointerLockControls } from "@react-three/drei";
import { Lighting } from "../Lighting";
import { RoomEnvironment, ROOM_DEPTH, ROOM_HEIGHT, ROOM_WIDTH } from "../RoomEnvironment";
import { ArtworkMesh } from "../ArtworkMesh";
import { Player } from "./Player";

const ARTWORK_HEIGHT_Y = ROOM_HEIGHT / 2;
const WALL_INSET = 0.06;
const METERS_PER_CM = 0.01;

const SLOTS: Array<{ position: [number, number, number]; rotationY: number }> = [
  { position: [-1.6, ARTWORK_HEIGHT_Y, -ROOM_DEPTH / 2 + WALL_INSET], rotationY: 0 },
  { position: [1.6, ARTWORK_HEIGHT_Y, -ROOM_DEPTH / 2 + WALL_INSET], rotationY: 0 },
  { position: [-ROOM_WIDTH / 2 + WALL_INSET, ARTWORK_HEIGHT_Y, 1], rotationY: Math.PI / 2 },
];

const PLACEHOLDER_ARTWORKS = [
  { widthMeters: 1.2, heightMeters: 0.9, color: "#7d7263" },
  { widthMeters: 0.9, heightMeters: 1.1, color: "#8f9a8a" },
  { widthMeters: 1.4, heightMeters: 1.0, color: "#a08a72" },
];

interface ExhibitionSceneProps {
  onLockChange?: (locked: boolean) => void;
  artworks?: Artwork[];
  onArtworkSelect?: (artwork: Artwork) => void;
  /** Freezes WASD movement, e.g. while an artwork detail panel is open. */
  paused?: boolean;
}

/**
 * Phase 4: the Phase 1-3 gallery gains artwork interaction — hovering an
 * artwork highlights its frame, clicking it selects it (see
 * ArtworkDetailSheet in the parent, rendered outside the Canvas). Clicking
 * is gated on the pointer already being locked so the very first click
 * (which both requests pointer lock and would otherwise land on whatever's
 * under the crosshair) can't accidentally open a panel.
 */
export function ExhibitionScene({
  onLockChange,
  artworks = [],
  onArtworkSelect,
  paused = false,
}: ExhibitionSceneProps) {
  const [isLocked, setIsLocked] = useState(false);

  const handleLockChange = (locked: boolean) => {
    setIsLocked(locked);
    onLockChange?.(locked);
  };

  return (
    <>
      <Lighting />
      <PointerLockControls
        onLock={() => handleLockChange(true)}
        onUnlock={() => handleLockChange(false)}
      />

      <Player paused={paused} />

      <RoomEnvironment />

      {SLOTS.map((slot, index) => {
        const artwork = artworks[index];
        const placeholder = PLACEHOLDER_ARTWORKS[index];
        return artwork ? (
          <ArtworkMesh
            key={artwork.id}
            position={slot.position}
            rotationY={slot.rotationY}
            widthMeters={artwork.widthCm * METERS_PER_CM}
            heightMeters={artwork.heightCm * METERS_PER_CM}
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
        ) : (
          <ArtworkMesh
            key={`placeholder-${index}`}
            position={slot.position}
            rotationY={slot.rotationY}
            widthMeters={placeholder.widthMeters}
            heightMeters={placeholder.heightMeters}
            color={placeholder.color}
          />
        );
      })}
    </>
  );
}
