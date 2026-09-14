"use client";

import { Component, Suspense, useLayoutEffect, useState, type ReactNode } from "react";
import { useTexture, Html } from "@react-three/drei";
import type { ThreeEvent } from "@react-three/fiber";
import { SRGBColorSpace } from "three";
import { textureImageUrl } from "@/lib/image-hosts";

interface ArtworkMeshProps {
  position: [number, number, number];
  rotationY?: number;
  rotation?: [number, number, number];
  widthMeters: number;
  heightMeters: number;
  color?: string;
  frameColor?: string;
  imageUrl?: string;
  sold?: boolean;
  selected?: boolean;
  /** When provided, the artwork is hoverable/clickable and shows a highlight. */
  onSelect?: () => void;
}

const FRAME_DEPTH = 0.04;
const FRAME_BORDER = 0.05;
const HOVER_COLOR = "#c9a227";

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
  textureUrl,
}: {
  widthMeters: number;
  heightMeters: number;
  textureUrl: string;
}) {
  const texture = useTexture(textureUrl);
  // Photos are sRGB; left at the loader's default (no colour space) they
  // render washed out under the renderer's sRGB output.
  useLayoutEffect(() => {
    texture.colorSpace = SRGBColorSpace;
    texture.needsUpdate = true;
  }, [texture]);
  return (
    <mesh position={[0, 0, FRAME_DEPTH / 2 + 0.001]}>
      <planeGeometry args={[widthMeters, heightMeters]} />
      <meshStandardMaterial map={texture} />
    </mesh>
  );
}

/**
 * useTexture surfaces a failed image load by throwing, and without a boundary
 * that unmounts the whole Canvas (the builder/viewer page died to a single
 * un-loadable image). Fall back to the placeholder panel for just this one
 * artwork instead. Keyed on the URL by the caller so a new image gets a fresh
 * attempt.
 */
class TextureErrorBoundary extends Component<{ fallback: ReactNode; children: ReactNode }, { failed: boolean }> {
  state = { failed: false };

  static getDerivedStateFromError() {
    return { failed: true };
  }

  render() {
    return this.state.failed ? this.props.fallback : this.props.children;
  }
}

/**
 * Artwork frame rendered at real dimensions (widthMeters/heightMeters come
 * from the artwork's widthCm/heightCm, converted 1cm = 0.01 three.js units).
 * Renders the real image when `imageUrl` is given, falling back to a
 * placeholder color panel while it loads, when it fails to load, or when no
 * image is available. Hoverable/clickable (highlighted frame) when `onSelect`
 * is provided.
 */
export function ArtworkMesh({
  position,
  rotationY = 0,
  rotation,
  widthMeters,
  heightMeters,
  color = "#8a8578",
  frameColor = "#2a2622",
  imageUrl,
  sold = false,
  selected = false,
  onSelect,
}: ArtworkMeshProps) {
  const [hovered, setHovered] = useState(false);
  const interactive = Boolean(onSelect);
  const highlighted = hovered || selected;
  const textureUrl = textureImageUrl(imageUrl);
  const placeholder = <ColorPanel widthMeters={widthMeters} heightMeters={heightMeters} color={color} />;

  const handlePointerOver = (event: ThreeEvent<PointerEvent>) => {
    event.stopPropagation();
    setHovered(true);
    document.body.style.cursor = "pointer";
  };
  const handlePointerOut = (event: ThreeEvent<PointerEvent>) => {
    event.stopPropagation();
    setHovered(false);
    document.body.style.cursor = "auto";
  };
  const handleClick = (event: ThreeEvent<MouseEvent>) => {
    event.stopPropagation();
    onSelect?.();
  };

  return (
    <group
      position={position}
      rotation={rotation ?? [0, rotationY, 0]}
      onPointerOver={interactive ? handlePointerOver : undefined}
      onPointerOut={interactive ? handlePointerOut : undefined}
      onClick={interactive ? handleClick : undefined}
    >
      <mesh castShadow receiveShadow>
        <boxGeometry args={[widthMeters + FRAME_BORDER, heightMeters + FRAME_BORDER, FRAME_DEPTH]} />
        <meshStandardMaterial
          color={highlighted ? HOVER_COLOR : frameColor}
          emissive={highlighted ? HOVER_COLOR : "#000000"}
          emissiveIntensity={highlighted ? 0.4 : 0}
        />
      </mesh>
      {textureUrl ? (
        <TextureErrorBoundary key={textureUrl} fallback={placeholder}>
          <Suspense fallback={placeholder}>
            <TexturedPanel widthMeters={widthMeters} heightMeters={heightMeters} textureUrl={textureUrl} />
          </Suspense>
        </TextureErrorBoundary>
      ) : (
        placeholder
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
