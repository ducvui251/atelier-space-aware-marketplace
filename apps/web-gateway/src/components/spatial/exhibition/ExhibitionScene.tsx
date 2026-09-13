"use client";

import { PointerLockControls } from "@react-three/drei";
import { Lighting } from "../Lighting";
import { RoomEnvironment, ROOM_DEPTH, ROOM_HEIGHT, ROOM_WIDTH } from "../RoomEnvironment";
import { ArtworkMesh } from "../ArtworkMesh";
import { Player } from "./Player";

const ARTWORK_HEIGHT_Y = ROOM_HEIGHT / 2;
const WALL_INSET = 0.06;

const PLACEHOLDER_ARTWORKS = [
  { widthMeters: 1.2, heightMeters: 0.9, color: "#7d7263" },
  { widthMeters: 0.9, heightMeters: 1.1, color: "#8f9a8a" },
  { widthMeters: 1.4, heightMeters: 1.0, color: "#a08a72" },
];

interface ExhibitionSceneProps {
  onLockChange?: (locked: boolean) => void;
}

/**
 * Phase 2: the Phase 1 static gallery plus WASD + mouse-look navigation and
 * wall collision. Still no real artwork data.
 */
export function ExhibitionScene({ onLockChange }: ExhibitionSceneProps) {
  const [back, side1, side2] = PLACEHOLDER_ARTWORKS;

  return (
    <>
      <Lighting />
      <PointerLockControls
        onLock={() => onLockChange?.(true)}
        onUnlock={() => onLockChange?.(false)}
      />

      <Player />

      <RoomEnvironment />

      <ArtworkMesh
        position={[-1.6, ARTWORK_HEIGHT_Y, -ROOM_DEPTH / 2 + WALL_INSET]}
        widthMeters={back.widthMeters}
        heightMeters={back.heightMeters}
        color={back.color}
      />
      <ArtworkMesh
        position={[1.6, ARTWORK_HEIGHT_Y, -ROOM_DEPTH / 2 + WALL_INSET]}
        widthMeters={side1.widthMeters}
        heightMeters={side1.heightMeters}
        color={side1.color}
      />
      <ArtworkMesh
        position={[-ROOM_WIDTH / 2 + WALL_INSET, ARTWORK_HEIGHT_Y, 1]}
        rotationY={Math.PI / 2}
        widthMeters={side2.widthMeters}
        heightMeters={side2.heightMeters}
        color={side2.color}
      />
    </>
  );
}
