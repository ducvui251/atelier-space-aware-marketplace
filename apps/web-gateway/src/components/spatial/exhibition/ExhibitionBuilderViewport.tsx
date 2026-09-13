"use client";

import { Canvas } from "@react-three/fiber";
import { OrbitControls } from "@react-three/drei";
import type { Artwork, ExhibitionPlacement } from "@atelier/contracts";
import { Lighting } from "../Lighting";
import { RoomEnvironment } from "../RoomEnvironment";
import { ArtworkMesh } from "../ArtworkMesh";

const METERS_PER_CM = 0.01;
const DEGREES_TO_RADIANS = Math.PI / 180;
const FRAME_COLORS: Record<string, string> = {
  "dark-wood": "#2a2622",
  "light-wood": "#a58b67",
  black: "#171717",
  white: "#f5f3ee",
};

export interface BuilderArtworkPlacement {
  placement: ExhibitionPlacement;
  artwork: Artwork;
}

export interface ExhibitionBuilderViewportProps {
  roomTemplateId: string;
  placedArtworks: BuilderArtworkPlacement[];
  selectedPlacementId: string | null;
  onSelect: (placementId: string) => void;
}

export function ExhibitionBuilderViewport({ roomTemplateId, placedArtworks, selectedPlacementId, onSelect }: ExhibitionBuilderViewportProps) {
  return (
    <Canvas shadows dpr={[1, 1.5]} camera={{ position: [0, 2.1, 3.7], fov: 52, near: 0.1, far: 100 }}>
      <Lighting templateId={roomTemplateId} />
      <RoomEnvironment templateId={roomTemplateId} />
      <OrbitControls enableDamping enablePan={false} minDistance={1.5} maxDistance={7.5} target={[0, 1.6, 0]} />
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
          frameColor={FRAME_COLORS[placement.frameStyle ?? "dark-wood"] ?? FRAME_COLORS["dark-wood"]}
          selected={placement.id === selectedPlacementId}
          onSelect={() => onSelect(placement.id)}
        />
      ))}
    </Canvas>
  );
}
