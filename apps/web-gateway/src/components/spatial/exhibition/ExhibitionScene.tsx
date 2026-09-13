"use client";

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
}

/**
 * Phase 3: the Phase 1/2 gallery with real artwork data (image, real
 * dimensions, sold state) in place of solid-color placeholders, falling
 * back to a placeholder per slot when there isn't enough live data.
 */
export function ExhibitionScene({ onLockChange, artworks = [] }: ExhibitionSceneProps) {
  return (
    <>
      <Lighting />
      <PointerLockControls
        onLock={() => onLockChange?.(true)}
        onUnlock={() => onLockChange?.(false)}
      />

      <Player />

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
