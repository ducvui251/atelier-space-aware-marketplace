"use client";

import { EXHIBITION_BUILDER_ROOM_TEMPLATE_ID } from "@atelier/contracts";

export const ROOM_WIDTH = 10;
export const ROOM_DEPTH = 10;
export const ROOM_HEIGHT = 3.2;

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
}

export function RoomEnvironment({ templateId = EXHIBITION_BUILDER_ROOM_TEMPLATE_ID, width, depth, wallColor }: RoomEnvironmentProps) {
  const appearance = ROOM_APPEARANCES[templateId] ?? ROOM_APPEARANCES[EXHIBITION_BUILDER_ROOM_TEMPLATE_ID];
  const roomWidth = width ?? ROOM_WIDTH;
  const roomDepth = depth ?? ROOM_DEPTH;
  const wall = wallColor ?? appearance.wall;

  return (
    <group>
      <mesh rotation={[-Math.PI / 2, 0, 0]} receiveShadow>
        <planeGeometry args={[roomWidth, roomDepth]} />
        <meshStandardMaterial color={appearance.floor} />
      </mesh>

      <mesh position={[0, ROOM_HEIGHT, 0]} rotation={[Math.PI / 2, 0, 0]} receiveShadow>
        <planeGeometry args={[roomWidth, roomDepth]} />
        <meshStandardMaterial color={appearance.ceiling} />
      </mesh>

      <mesh position={[0, ROOM_HEIGHT / 2, -roomDepth / 2]} receiveShadow>
        <planeGeometry args={[roomWidth, ROOM_HEIGHT]} />
        <meshStandardMaterial color={wall} />
      </mesh>

      <mesh
        position={[0, ROOM_HEIGHT / 2, roomDepth / 2]}
        rotation={[0, Math.PI, 0]}
      >
        <planeGeometry args={[roomWidth, ROOM_HEIGHT]} />
        <meshStandardMaterial color={wall} />
      </mesh>

      <mesh
        position={[-roomWidth / 2, ROOM_HEIGHT / 2, 0]}
        rotation={[0, Math.PI / 2, 0]}
      >
        <planeGeometry args={[roomDepth, ROOM_HEIGHT]} />
        <meshStandardMaterial color={wall} />
      </mesh>

      <mesh
        position={[roomWidth / 2, ROOM_HEIGHT / 2, 0]}
        rotation={[0, -Math.PI / 2, 0]}
      >
        <planeGeometry args={[roomDepth, ROOM_HEIGHT]} />
        <meshStandardMaterial color={wall} />
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
    </group>
  );
}
