"use client";

import { useEffect, useMemo, useRef } from "react";
import { useFrame, useThree } from "@react-three/fiber";
import * as THREE from "three";
import { ROOM_DEPTH, ROOM_WIDTH } from "../RoomEnvironment";
import type { ExhibitionSceneDoor, SceneWall } from "@atelier/contracts";
import { collisionWallsForDoors } from "../door-geometry";

const MOVE_SPEED = 3.2;
const PLAYER_RADIUS = 0.35;
const EYE_HEIGHT = 1.6;
const SPAWN_POSITION: [number, number, number] = [0, EYE_HEIGHT, 2.5];

type MoveDirection = "forward" | "backward" | "left" | "right";

const KEY_MAP: Record<string, MoveDirection> = {
  KeyW: "forward",
  ArrowUp: "forward",
  KeyS: "backward",
  ArrowDown: "backward",
  KeyA: "left",
  ArrowLeft: "left",
  KeyD: "right",
  ArrowRight: "right",
};

const pressedKeys = new Set<MoveDirection>();

interface PlayerProps {
  /** Freezes WASD movement (e.g. while an artwork detail panel is open). */
  paused?: boolean;
  /** Room footprint for the collision bounds — must match the RoomEnvironment rendered alongside this Player. */
  roomWidth?: number;
  roomDepth?: number;
  /**
   * Custom Artsteps-style wall segments for raycast collision.
   * When provided, overrides simple rectangular clamping with line-segment collision.
   */
  wallSegments?: SceneWall[];
  doors?: ExhibitionSceneDoor[];
  openDoorIds?: ReadonlySet<string>;
}

/**
 * Tests whether the line segment [from, to] intersects the wall segment
 * [wa, wb] on the XZ plane. Returns true if they cross within the step
 * distance, which means movement is blocked.
 */
function segmentIntersectsWall(
  from: THREE.Vector3,
  to: THREE.Vector3,
  wa: THREE.Vector3,
  wb: THREE.Vector3,
): boolean {
  // Segment from→to
  const fxt = to.x - from.x;
  const fzt = to.z - from.z;
  // Segment wa→wb
  const wxt = wb.x - wa.x;
  const wzt = wb.z - wa.z;
  const denom = fxt * wzt - fzt * wxt;
  if (Math.abs(denom) < 1e-8) return false; // parallel
  const dx = wa.x - from.x;
  const dz = wa.z - from.z;
  const t = (dx * wzt - dz * wxt) / denom;
  const u = (dx * fzt - dz * fxt) / denom;
  return t >= 0 && t <= 1 && u >= 0 && u <= 1;
}

/**
 * WASD + mouse-look player with optional raycast-based wall collision.
 * When `wallSegments` is provided, movement is clamped against each wall
 * segment using line-segment distance checks. Falls back to rectangular
 * bounding-box clamping when no segments are given.
 */
export function Player({ paused = false, roomWidth = ROOM_WIDTH, roomDepth = ROOM_DEPTH, wallSegments, doors, openDoorIds = new Set<string>() }: PlayerProps) {
  const { camera } = useThree();
  const position = useRef(new THREE.Vector3(...SPAWN_POSITION));
  const boundsX = roomWidth / 2 - PLAYER_RADIUS;
  const boundsZ = roomDepth / 2 - PLAYER_RADIUS;
  // Cache wall segment endpoints in Three.js vectors to avoid reallocation.
  const wallCache = useRef<{ a: THREE.Vector3; b: THREE.Vector3 }[]>([]);
  const collisionWalls = useMemo(() => collisionWallsForDoors(wallSegments, doors, openDoorIds), [doors, openDoorIds, wallSegments]);

  useEffect(() => {
    camera.position.copy(position.current);
  }, [camera]);

  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      const direction = KEY_MAP[event.code];
      if (direction) pressedKeys.add(direction);
    };
    const handleKeyUp = (event: KeyboardEvent) => {
      const direction = KEY_MAP[event.code];
      if (direction) pressedKeys.delete(direction);
    };
    window.addEventListener("keydown", handleKeyDown);
    window.addEventListener("keyup", handleKeyUp);
    return () => {
      window.removeEventListener("keydown", handleKeyDown);
      window.removeEventListener("keyup", handleKeyUp);
      pressedKeys.clear();
    };
  }, []);

  // Rebuild wall cache when segments change.
  useEffect(() => {
    if (!collisionWalls || collisionWalls.length === 0) {
      wallCache.current = [];
      return;
    }
    wallCache.current = collisionWalls.map((w) => ({
      a: new THREE.Vector3(w.start[0], 0, w.start[1]),
      b: new THREE.Vector3(w.end[0], 0, w.end[1]),
    }));
  }, [collisionWalls]);

  const forward = useMemo(() => new THREE.Vector3(), []);
  const right = useMemo(() => new THREE.Vector3(), []);
  const moveDir = useMemo(() => new THREE.Vector3(), []);
  const candidatePos = useMemo(() => new THREE.Vector3(), []);
  const wallA = useMemo(() => new THREE.Vector3(), []);
  const wallB = useMemo(() => new THREE.Vector3(), []);

  useFrame((_, delta) => {
    if (paused) return;

    camera.getWorldDirection(forward);
    forward.y = 0;
    forward.normalize();
    right.crossVectors(forward, camera.up).normalize();

    moveDir.set(0, 0, 0);
    if (pressedKeys.has("forward")) moveDir.add(forward);
    if (pressedKeys.has("backward")) moveDir.sub(forward);
    if (pressedKeys.has("right")) moveDir.add(right);
    if (pressedKeys.has("left")) moveDir.sub(right);

    if (moveDir.lengthSq() === 0) return;

    moveDir.normalize().multiplyScalar(MOVE_SPEED * delta);
    candidatePos.copy(position.current).add(moveDir);

    if (collisionWalls && collisionWalls.length > 0) {
      // Raycast-style collision: test whether the movement step crosses
      // any wall segment on the XZ plane.  Check X and Z axes independently
      // so diagonal movement still slides along walls.
      const moveX = Math.abs(moveDir.x) > 0.001;
      const moveZ = Math.abs(moveDir.z) > 0.001;

      if (moveX) {
        let blocked = false;
        for (const seg of wallCache.current) {
          wallA.copy(seg.a);
          wallB.copy(seg.b);
          if (segmentIntersectsWall(position.current, candidatePos, wallA, wallB)) {
            blocked = true;
            break;
          }
        }
        if (!blocked) {
          candidatePos.x = position.current.x + moveDir.x;
        }
      }

      if (moveZ) {
        const zCandidate = new THREE.Vector3(candidatePos.x, 0, position.current.z + moveDir.z);
        let blocked = false;
        for (const seg of wallCache.current) {
          wallA.copy(seg.a);
          wallB.copy(seg.b);
          if (segmentIntersectsWall(position.current, zCandidate, wallA, wallB)) {
            blocked = true;
            break;
          }
        }
        if (!blocked) {
          candidatePos.z = position.current.z + moveDir.z;
        }
      }

      position.current.x = THREE.MathUtils.clamp(candidatePos.x, -boundsX, boundsX);
      position.current.z = THREE.MathUtils.clamp(candidatePos.z, -boundsZ, boundsZ);
    } else {
      // Fallback: simple rectangular bounds (original behavior)
      position.current.x = THREE.MathUtils.clamp(candidatePos.x, -boundsX, boundsX);
      position.current.z = THREE.MathUtils.clamp(candidatePos.z, -boundsZ, boundsZ);
    }

    camera.position.x = position.current.x;
    camera.position.z = position.current.z;
  });

  return null;
}
