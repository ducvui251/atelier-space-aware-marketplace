"use client";

interface ArtworkMeshProps {
  position: [number, number, number];
  rotationY?: number;
  widthMeters: number;
  heightMeters: number;
  color?: string;
  frameColor?: string;
}

const FRAME_DEPTH = 0.04;
const FRAME_BORDER = 0.05;

/**
 * Placeholder artwork frame: a thin colored panel inset in a darker frame box.
 * Shared by both the single-artwork spatial preview and 3D exhibitions
 * (ADR: shared spatial engine). Real artwork textures replace `color` in
 * Phase 3.
 */
export function ArtworkMesh({
  position,
  rotationY = 0,
  widthMeters,
  heightMeters,
  color = "#8a8578",
  frameColor = "#2a2622",
}: ArtworkMeshProps) {
  return (
    <group position={position} rotation={[0, rotationY, 0]}>
      <mesh castShadow receiveShadow>
        <boxGeometry args={[widthMeters + FRAME_BORDER, heightMeters + FRAME_BORDER, FRAME_DEPTH]} />
        <meshStandardMaterial color={frameColor} />
      </mesh>
      <mesh position={[0, 0, FRAME_DEPTH / 2 + 0.001]}>
        <planeGeometry args={[widthMeters, heightMeters]} />
        <meshStandardMaterial color={color} />
      </mesh>
    </group>
  );
}
