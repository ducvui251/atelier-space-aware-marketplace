"use client";

import { useMemo } from "react";
import * as THREE from "three";
import type { DerivedRoofLoop } from "@/components/exhibition-editor-v2/roof-geometry";

const DEFAULT_CEILING_THICKNESS = 0.08;
const ignoreRaycast: THREE.Mesh["raycast"] = () => undefined;

function signedArea(points: readonly [number, number][]): number {
  return points.reduce((sum, point, index) => {
    const next = points[(index + 1) % points.length];
    return sum + point[0] * next[1] - next[0] * point[1];
  }, 0);
}

function createCeilingGeometry(points: readonly [number, number][], thickness: number): THREE.ExtrudeGeometry | null {
  if (points.length < 3) return null;
  const woundPoints = signedArea(points) < 0 ? [...points].reverse() : [...points];
  const firstPoint = woundPoints[0];
  if (!firstPoint) return null;

  const shape = new THREE.Shape();
  shape.moveTo(firstPoint[0], firstPoint[1]);
  woundPoints.slice(1).forEach((point) => shape.lineTo(point[0], point[1]));
  shape.closePath();

  return new THREE.ExtrudeGeometry(shape, {
    bevelEnabled: false,
    depth: thickness,
    steps: 1,
  });
}

interface CeilingMeshProps {
  loop: DerivedRoofLoop;
  color?: string;
  thickness?: number;
}

/** Renders a non-interactive, double-sided ceiling for one derived room loop. */
export function CeilingMesh({ loop, color = "#f7fafc", thickness = DEFAULT_CEILING_THICKNESS }: CeilingMeshProps) {
  const geometry = useMemo(() => createCeilingGeometry(loop.points, thickness), [loop.points, thickness]);
  if (!geometry) return null;

  return (
    <mesh
      geometry={geometry}
      position={[0, loop.ceilingElevation, 0]}
      rotation={[Math.PI / 2, 0, 0]}
      raycast={ignoreRaycast}
      receiveShadow
    >
      <meshStandardMaterial color={color} side={THREE.DoubleSide} roughness={0.9} />
    </mesh>
  );
}
