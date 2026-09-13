"use client";

import { useEffect, useMemo, useRef } from "react";
import { useFrame, useThree } from "@react-three/fiber";
import * as THREE from "three";
import { ROOM_DEPTH, ROOM_WIDTH } from "../RoomEnvironment";

const MOVE_SPEED = 3.2;
const PLAYER_RADIUS = 0.35;
const EYE_HEIGHT = 1.6;
const SPAWN_POSITION: [number, number, number] = [0, EYE_HEIGHT, 2.5];

const BOUNDS_X = ROOM_WIDTH / 2 - PLAYER_RADIUS;
const BOUNDS_Z = ROOM_DEPTH / 2 - PLAYER_RADIUS;

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

/**
 * WASD + mouse-look player. Collision uses the simple room-bounding-box
 * backup from the exhibition plan (clamping X/Z to the room interior) rather
 * than a full physics engine, since the room is a single rectangular volume
 * with no interior obstacles yet. Look direction comes from the R3F default
 * camera, which PointerLockControls rotates elsewhere in the scene.
 */
export function Player() {
  const { camera } = useThree();
  const position = useRef(new THREE.Vector3(...SPAWN_POSITION));

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

  const forward = useMemo(() => new THREE.Vector3(), []);
  const right = useMemo(() => new THREE.Vector3(), []);
  const moveDir = useMemo(() => new THREE.Vector3(), []);

  useFrame((_, delta) => {
    camera.getWorldDirection(forward);
    forward.y = 0;
    forward.normalize();
    right.crossVectors(forward, camera.up).normalize();

    moveDir.set(0, 0, 0);
    if (pressedKeys.has("forward")) moveDir.add(forward);
    if (pressedKeys.has("backward")) moveDir.sub(forward);
    if (pressedKeys.has("right")) moveDir.add(right);
    if (pressedKeys.has("left")) moveDir.sub(right);

    if (moveDir.lengthSq() > 0) {
      moveDir.normalize().multiplyScalar(MOVE_SPEED * delta);
      position.current.x += moveDir.x;
      position.current.z += moveDir.z;
      position.current.x = THREE.MathUtils.clamp(position.current.x, -BOUNDS_X, BOUNDS_X);
      position.current.z = THREE.MathUtils.clamp(position.current.z, -BOUNDS_Z, BOUNDS_Z);
      camera.position.x = position.current.x;
      camera.position.z = position.current.z;
    }
  });

  return null;
}
