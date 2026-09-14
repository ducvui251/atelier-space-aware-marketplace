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
      // Shadows disabled: the directional light + room-scale geometry were
      // producing broken, floating shadow polygons instead of a soft drop
      // shadow (visible in both the builder and the public viewer).
      // Diagnosing the shadow-camera frustum wasn't worth it for a gallery
      // scene where wall/floor lighting alone already reads as flat and
      // clean — same call as ExhibitionBuilderViewport.
      dpr={[1, 1.5]}
      camera={{ position: cameraPosition, fov: 60, near: 0.1, far: 100 }}
    >
      {children}
    </Canvas>
  );
}
