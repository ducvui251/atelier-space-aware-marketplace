"use client";

import { EXHIBITION_BUILDER_ROOM_TEMPLATE_ID } from "@atelier/contracts";
import type { ExhibitionSceneDoor, ExhibitionSceneStyle, SceneWall } from "@atelier/contracts";
import type { ThreeEvent } from "@react-three/fiber";
import { EXHIBITION_BOX_DEPTH, EXHIBITION_BOX_HEIGHT, EXHIBITION_BOX_WIDTH } from "./exhibition-box";
import { WallMesh } from "./WallMesh";
import { DoorMesh } from "./DoorMesh";

export const ROOM_WIDTH = EXHIBITION_BOX_WIDTH;
export const ROOM_DEPTH = EXHIBITION_BOX_DEPTH;
export const ROOM_HEIGHT = EXHIBITION_BOX_HEIGHT;

interface RoomAppearance {
  floor: string;
  ceiling: string;
  wall: string;
  trim?: string;
  track?: string;
}

const ROOM_APPEARANCES: Record<string, RoomAppearance> = {
  "white-cube": { floor: "#c9c2b4", ceiling: "#eae7df", wall: "#f5f3ee" },
  "warm-gallery": { floor: "#846a4b", ceiling: "#f4ead9", wall: "#e8d7bd", trim: "#a08059" },
  "black-box": { floor: "#242528", ceiling: "#17181b", wall: "#34363a", track: "#5b5d62" },
};

interface RoomEnvironmentProps {
  templateId?: string;
  /** Overrides the template's fixed 10x10 footprint when set (6-10m each). */
  width?: number;
  depth?: number;
  /** Overrides the template's wall color when set; floor/ceiling/trim/track stay from the template. */
  wallColor?: string;
  /**
   * Custom Artsteps-style wall segments. When non-empty, renders these instead
   * of the fixed 4-wall box. Floor and ceiling still render.
   */
  wallSegments?: SceneWall[];
  doors?: ExhibitionSceneDoor[];
  openDoorIds?: ReadonlySet<string>;
  onDoorToggle?: (doorId: string) => void;
  doorInteractionsEnabled?: boolean;
  style?: ExhibitionSceneStyle;
  onWallPointerMove?: (event: ThreeEvent<PointerEvent>, wall: SceneWall) => void;
  onWallPointerDown?: (event: ThreeEvent<PointerEvent>, wall: SceneWall) => void;
}

function materialProperties(material: ExhibitionSceneStyle["wallMaterial"] | undefined) {
  if (material === "polished") return { roughness: 0.24, metalness: 0.08 };
  if (material === "satin") return { roughness: 0.58, metalness: 0.04 };
  return { roughness: 0.92, metalness: 0 };
}

export function RoomEnvironment({
  templateId = EXHIBITION_BUILDER_ROOM_TEMPLATE_ID,
  width,
  depth,
  wallColor,
  wallSegments,
  doors = [],
  openDoorIds = new Set<string>(),
  onDoorToggle,
  doorInteractionsEnabled = false,
  style,
  onWallPointerMove,
  onWallPointerDown,
}: RoomEnvironmentProps) {
  const appearance = ROOM_APPEARANCES[templateId] ?? ROOM_APPEARANCES[EXHIBITION_BUILDER_ROOM_TEMPLATE_ID];
  const roomWidth = width ?? ROOM_WIDTH;
  const roomDepth = depth ?? ROOM_DEPTH;
  const wall = style?.wallColor ?? wallColor ?? appearance.wall;
  const wallMaterial = materialProperties(style?.wallMaterial);
  const floorMaterial = materialProperties(style?.floorMaterial);
  const hasCustomWalls = Array.isArray(wallSegments) && wallSegments.length > 0;

  return (
    <group>
      <mesh rotation={[-Math.PI / 2, 0, 0]} receiveShadow>
        <planeGeometry args={[roomWidth, roomDepth]} />
        <meshStandardMaterial color={style?.floorColor ?? appearance.floor} {...floorMaterial} />
      </mesh>

      <mesh position={[0, ROOM_HEIGHT, 0]} rotation={[Math.PI / 2, 0, 0]} receiveShadow>
        <planeGeometry args={[roomWidth, roomDepth]} />
        <meshStandardMaterial color={style?.ceilingColor ?? appearance.ceiling} {...wallMaterial} />
      </mesh>

      {hasCustomWalls ? (
        <>
          {wallSegments.map((w) => (
            <WallMesh key={w.id} wall={w} wallColor={wall} doors={doors.filter((door) => door.wallId === w.id)} onWallPointerMove={onWallPointerMove} onWallPointerDown={onWallPointerDown} {...wallMaterial} />
          ))}
          {doors.map((door) => {
            const wallForDoor = wallSegments.find((wallSegment) => wallSegment.id === door.wallId);
            return wallForDoor ? (
              <DoorMesh
                key={door.id}
                door={door}
                wall={wallForDoor}
                levelWalls={wallSegments}
                open={openDoorIds.has(door.id)}
                interactive={doorInteractionsEnabled}
                onToggle={onDoorToggle}
              />
            ) : null;
          })}
        </>
      ) : (
        <>
          <mesh position={[0, ROOM_HEIGHT / 2, -roomDepth / 2]} receiveShadow>
            <planeGeometry args={[roomWidth, ROOM_HEIGHT]} />
            <meshStandardMaterial color={wall} {...wallMaterial} />
          </mesh>

          <mesh
            position={[0, ROOM_HEIGHT / 2, roomDepth / 2]}
            rotation={[0, Math.PI, 0]}
          >
            <planeGeometry args={[roomWidth, ROOM_HEIGHT]} />
            <meshStandardMaterial color={wall} {...wallMaterial} />
          </mesh>

          <mesh
            position={[-roomWidth / 2, ROOM_HEIGHT / 2, 0]}
            rotation={[0, Math.PI / 2, 0]}
          >
            <planeGeometry args={[roomDepth, ROOM_HEIGHT]} />
            <meshStandardMaterial color={wall} {...wallMaterial} />
          </mesh>

          <mesh
            position={[roomWidth / 2, ROOM_HEIGHT / 2, 0]}
            rotation={[0, -Math.PI / 2, 0]}
          >
            <planeGeometry args={[roomDepth, ROOM_HEIGHT]} />
            <meshStandardMaterial color={wall} {...wallMaterial} />
          </mesh>

          {appearance.trim ? (
            <group>
              <mesh position={[0, 0.07, -roomDepth / 2 + 0.04]}>
                <boxGeometry args={[roomWidth, 0.14, 0.08]} />
                <meshStandardMaterial color={appearance.trim} />
              </mesh>
              <mesh position={[0, 0.07, roomDepth / 2 - 0.04]}>
                <boxGeometry args={[roomWidth, 0.14, 0.08]} />
                <meshStandardMaterial color={appearance.trim} />
              </mesh>
              <mesh position={[-roomWidth / 2 + 0.04, 0.07, 0]} rotation={[0, Math.PI / 2, 0]}>
                <boxGeometry args={[roomDepth, 0.14, 0.08]} />
                <meshStandardMaterial color={appearance.trim} />
              </mesh>
              <mesh position={[roomWidth / 2 - 0.04, 0.07, 0]} rotation={[0, Math.PI / 2, 0]}>
                <boxGeometry args={[roomDepth, 0.14, 0.08]} />
                <meshStandardMaterial color={appearance.trim} />
              </mesh>
            </group>
          ) : null}

          {appearance.track ? (
            <group>
              <mesh position={[-2.5, ROOM_HEIGHT - 0.12, 0]}>
                <boxGeometry args={[0.06, 0.06, 7]} />
                <meshStandardMaterial color={appearance.track} />
              </mesh>
              <mesh position={[2.5, ROOM_HEIGHT - 0.12, 0]}>
                <boxGeometry args={[0.06, 0.06, 7]} />
                <meshStandardMaterial color={appearance.track} />
              </mesh>
            </group>
          ) : null}
        </>
      )}
    </group>
  );
}
