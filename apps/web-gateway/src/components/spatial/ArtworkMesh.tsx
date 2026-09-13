"use client";

import { Suspense } from "react";
import { useTexture, Html } from "@react-three/drei";

interface ArtworkMeshProps {
  position: [number, number, number];
  rotationY?: number;
  widthMeters: number;
  heightMeters: number;
  color?: string;
  frameColor?: string;
  imageUrl?: string;
  sold?: boolean;
}

const FRAME_DEPTH = 0.04;
const FRAME_BORDER = 0.05;

function ColorPanel({
  widthMeters,
  heightMeters,
  color,
}: {
  widthMeters: number;
  heightMeters: number;
  color: string;
}) {
  return (
    <mesh position={[0, 0, FRAME_DEPTH / 2 + 0.001]}>
      <planeGeometry args={[widthMeters, heightMeters]} />
      <meshStandardMaterial color={color} />
    </mesh>
  );
}

function TexturedPanel({
  widthMeters,
  heightMeters,
  imageUrl,
}: {
  widthMeters: number;
  heightMeters: number;
  imageUrl: string;
}) {
  const texture = useTexture(imageUrl);
  return (
    <mesh position={[0, 0, FRAME_DEPTH / 2 + 0.001]}>
      <planeGeometry args={[widthMeters, heightMeters]} />
      <meshStandardMaterial map={texture} />
    </mesh>
  );
}

/**
 * Artwork frame rendered at real dimensions (widthMeters/heightMeters come
 * from the artwork's widthCm/heightCm, converted 1cm = 0.01 three.js units).
 * Renders the real image when `imageUrl` is given, falling back to a
 * placeholder color panel while it loads or when no image is available.
 */
export function ArtworkMesh({
  position,
  rotationY = 0,
  widthMeters,
  heightMeters,
  color = "#8a8578",
  frameColor = "#2a2622",
  imageUrl,
  sold = false,
}: ArtworkMeshProps) {
  return (
    <group position={position} rotation={[0, rotationY, 0]}>
      <mesh castShadow receiveShadow>
        <boxGeometry args={[widthMeters + FRAME_BORDER, heightMeters + FRAME_BORDER, FRAME_DEPTH]} />
        <meshStandardMaterial color={frameColor} />
      </mesh>
      {imageUrl ? (
        <Suspense fallback={<ColorPanel widthMeters={widthMeters} heightMeters={heightMeters} color={color} />}>
          <TexturedPanel widthMeters={widthMeters} heightMeters={heightMeters} imageUrl={imageUrl} />
        </Suspense>
      ) : (
        <ColorPanel widthMeters={widthMeters} heightMeters={heightMeters} color={color} />
      )}
      {sold ? (
        <Html position={[0, -heightMeters / 2 - 0.12, FRAME_DEPTH / 2 + 0.01]} center distanceFactor={8}>
          <span className="rounded bg-black/80 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-white">
            Sold
          </span>
        </Html>
      ) : null}
    </group>
  );
}
