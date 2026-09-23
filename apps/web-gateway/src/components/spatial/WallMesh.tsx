"use client";

import type { ExhibitionSceneDoor, SceneWall } from "@atelier/contracts";
import type { ThreeEvent } from "@react-three/fiber";
import { getWallMeshTransform } from "@/components/exhibition-editor-v2/wall-geometry";
import { doorOpening } from "./door-geometry";

interface WallMeshProps {
  wall: SceneWall;
  wallColor: string;
  selected?: boolean;
  onSelect?: () => void;
  onWallPointerMove?: (event: ThreeEvent<PointerEvent>, wall: SceneWall) => void;
  onWallPointerDown?: (event: ThreeEvent<PointerEvent>, wall: SceneWall) => void;
  onBeginEndpointDrag?: (endpoint: "start" | "end") => void;
  doors?: ExhibitionSceneDoor[];
  baseY?: number;
  roughness?: number;
  metalness?: number;
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

export function WallMesh({ wall, wallColor, selected = false, onSelect, onWallPointerMove, onWallPointerDown, onBeginEndpointDrag, doors = [], baseY = 0, roughness = 0.9, metalness = 0 }: WallMeshProps) {
  const transform = getWallMeshTransform(wall, baseY);
  if (!transform) return null;

  const openings = doors
    .map((door) => doorOpening(wall, door))
    .filter((opening) => opening.end > opening.start)
    .sort((a, b) => a.start - b.start);
  const wallPieces: Array<{ x: number; y: number; width: number; height: number }> = [];
  let cursor = 0;
  openings.forEach((opening) => {
    if (opening.start > cursor) wallPieces.push({ x: (cursor + opening.start) / 2, y: 0, width: opening.start - cursor, height: wall.height });
    if (opening.height < wall.height) wallPieces.push({ x: (opening.start + opening.end) / 2, y: opening.height / 2, width: opening.end - opening.start, height: wall.height - opening.height });
    cursor = Math.max(cursor, opening.end);
  });
  if (cursor < transform.length) wallPieces.push({ x: (cursor + transform.length) / 2, y: 0, width: transform.length - cursor, height: wall.height });
  if (!wallPieces.length) wallPieces.push({ x: transform.length / 2, y: 0, width: transform.length, height: wall.height });

  return (
    <>
      <group
        position={transform.position}
        rotation={transform.rotation}
        onPointerDown={(event) => {
          event.stopPropagation();
          onWallPointerDown?.(event, wall);
          onSelect?.();
        }}
        onPointerMove={onWallPointerMove ? (event) => {
          event.stopPropagation();
          onWallPointerMove(event, wall);
        } : undefined}
      >
        {wallPieces.map((piece, index) => (
          <mesh key={`${wall.id}:piece:${index}`} position={[piece.x - transform.length / 2, piece.y, 0]} receiveShadow castShadow>
            <boxGeometry args={[piece.width, piece.height, transform.size[2]]} />
            <meshStandardMaterial color={selected ? "#2563eb" : wallColor} side={2 /* THREE.DoubleSide */} roughness={roughness} metalness={metalness} />
          </mesh>
        ))}
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
