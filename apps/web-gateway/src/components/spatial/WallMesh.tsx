"use client";

import type { SceneWall } from "@atelier/contracts";
import { getWallMeshTransform } from "@/components/exhibition-editor-v2/wall-geometry";

interface WallMeshProps {
  wall: SceneWall;
  wallColor: string;
  selected?: boolean;
  onSelect?: () => void;
  onBeginEndpointDrag?: (endpoint: "start" | "end") => void;
  baseY?: number;
}

/**
 * Renders a single wall segment as a 3D box.
 *
 * Computes length and rotation from start/end points:
 *   dx = end.x - start.x, dz = end.z - start.z
 *   length = sqrt(dx² + dz²)
 *   angle  = atan2(dz, dx)   — Y rotation so the wall faces along its axis
 *
 * Position is the midpoint. The wall is extruded upward from y=0.
 */
function EndpointHandle({
  position,
  endpoint,
  onBeginEndpointDrag,
}: {
  position: [number, number, number];
  endpoint: "start" | "end";
  onBeginEndpointDrag: (endpoint: "start" | "end") => void;
}) {
  return (
    <mesh
      position={position}
      onPointerDown={(event) => {
        event.stopPropagation();
        onBeginEndpointDrag(endpoint);
      }}
    >
      <sphereGeometry args={[0.16, 16, 16]} />
      <meshStandardMaterial color="#f59e0b" />
    </mesh>
  );
}

export function WallMesh({ wall, wallColor, selected = false, onSelect, onBeginEndpointDrag, baseY = 0 }: WallMeshProps) {
  const transform = getWallMeshTransform(wall, baseY);
  if (!transform) return null;

  return (
    <>
      <group
        position={transform.position}
        rotation={transform.rotation}
        onPointerDown={(event) => {
          event.stopPropagation();
          onSelect?.();
        }}
      >
        <mesh receiveShadow castShadow>
          <boxGeometry args={transform.size} />
          <meshStandardMaterial color={selected ? "#2563eb" : wallColor} side={2 /* THREE.DoubleSide */} />
        </mesh>
      </group>
      {selected && onBeginEndpointDrag ? (
        <>
          <EndpointHandle position={[wall.start[0], baseY + wall.height / 2, wall.start[1]]} endpoint="start" onBeginEndpointDrag={onBeginEndpointDrag} />
          <EndpointHandle position={[wall.end[0], baseY + wall.height / 2, wall.end[1]]} endpoint="end" onBeginEndpointDrag={onBeginEndpointDrag} />
        </>
      ) : null}
    </>
  );
}
