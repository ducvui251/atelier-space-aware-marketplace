"use client";

import { Canvas } from "@react-three/fiber";
import type { ReactNode } from "react";

interface SpatialCanvasProps {
  children: ReactNode;
  cameraPosition?: [number, number, number];
}

export function SpatialCanvas({ children, cameraPosition = [0, 1.6, 4] }: SpatialCanvasProps) {
  return (
    <Canvas
      // `shadows` alone means PCFSoftShadowMap, which three r186 removed (it
      // warns and falls back to PCFShadowMap on every mount) — ask for it directly.
      shadows="percentage"
      dpr={[1, 1.5]}
      camera={{ position: cameraPosition, fov: 60, near: 0.1, far: 100 }}
    >
      {children}
    </Canvas>
  );
}
