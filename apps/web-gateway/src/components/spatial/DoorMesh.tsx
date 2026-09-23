"use client";

import { useRef } from "react";
import { useFrame } from "@react-three/fiber";
import * as THREE from "three";
import type { ExhibitionSceneDoor, SceneWall } from "@atelier/contracts";
import { doorCenter, doorOpening, doorWidth, DOOR_MAX_OPEN_ANGLE } from "./door-geometry";

interface DoorMeshProps {
  door: ExhibitionSceneDoor;
  wall: SceneWall;
  levelWalls: SceneWall[];
  baseY?: number;
  open?: boolean;
  interactive?: boolean;
  onToggle?: (doorId: string) => void;
}

const FRAME_WIDTH = 0.08;
const FRAME_DEPTH = 0.11;
const PANEL_DEPTH = 0.055;
const PANEL_COLOR = "#9a744e";
const FRAME_COLOR = "#5f4734";

function DoorPanel({
  width,
  hingeOffset,
  height,
  hinge,
  rotationTarget,
}: {
  width: number;
  hingeOffset: number;
  height: number;
  hinge: "left" | "right";
  rotationTarget: number;
}) {
  const pivot = useRef<THREE.Group>(null);

  useFrame((_, delta) => {
    if (pivot.current) pivot.current.rotation.y = THREE.MathUtils.damp(pivot.current.rotation.y, rotationTarget, 8, delta);
  });

  const isLeft = hinge === "left";
  return (
    <group ref={pivot} position={[isLeft ? -hingeOffset : hingeOffset, 0, 0]}>
      <mesh position={[isLeft ? width / 2 : -width / 2, height / 2, 0]} castShadow>
        <boxGeometry args={[width, height, PANEL_DEPTH]} />
        <meshStandardMaterial color={PANEL_COLOR} roughness={0.62} />
      </mesh>
      <mesh position={[isLeft ? width / 2 : -width / 2, height / 2, isLeft ? PANEL_DEPTH / 2 + 0.012 : -PANEL_DEPTH / 2 - 0.012]}>
        <boxGeometry args={[Math.max(0.08, width - 0.22), Math.max(0.08, height - 0.24), 0.018]} />
        <meshStandardMaterial color="#b28a5f" roughness={0.7} />
      </mesh>
    </group>
  );
}

export function DoorMesh({ door, wall, levelWalls, baseY = 0, open = false, interactive = false, onToggle }: DoorMeshProps) {
  const opening = doorOpening(wall, door);
  const width = doorWidth(door.type);
  const center = doorCenter(wall, door, levelWalls, baseY);
  const openAngle = -center.inwardSign * DOOR_MAX_OPEN_ANGLE;
  const panelWidth = door.type === "double" ? width / 2 : width;

  return (
    <group
      position={center.position}
      rotation={[0, center.rotationY, 0]}
      onPointerDown={interactive ? (event) => {
        event.stopPropagation();
        onToggle?.(door.id);
      } : undefined}
    >
      <mesh position={[-width / 2, opening.height / 2, 0]} castShadow>
        <boxGeometry args={[FRAME_WIDTH, opening.height, FRAME_DEPTH]} />
        <meshStandardMaterial color={FRAME_COLOR} roughness={0.55} />
      </mesh>
      <mesh position={[width / 2, opening.height / 2, 0]} castShadow>
        <boxGeometry args={[FRAME_WIDTH, opening.height, FRAME_DEPTH]} />
        <meshStandardMaterial color={FRAME_COLOR} roughness={0.55} />
      </mesh>
      <mesh position={[0, opening.height - FRAME_WIDTH / 2, 0]} castShadow>
        <boxGeometry args={[width + FRAME_WIDTH, FRAME_WIDTH, FRAME_DEPTH]} />
        <meshStandardMaterial color={FRAME_COLOR} roughness={0.55} />
      </mesh>
      {door.type === "double" ? (
        <>
          <DoorPanel width={panelWidth} hingeOffset={width / 2} height={opening.height - FRAME_WIDTH} hinge="left" rotationTarget={open ? openAngle : 0} />
          <DoorPanel width={panelWidth} hingeOffset={width / 2} height={opening.height - FRAME_WIDTH} hinge="right" rotationTarget={open ? -openAngle : 0} />
        </>
      ) : (
        <DoorPanel width={panelWidth} hingeOffset={width / 2} height={opening.height - FRAME_WIDTH} hinge="left" rotationTarget={open ? openAngle : 0} />
      )}
    </group>
  );
}
