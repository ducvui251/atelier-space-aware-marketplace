"use client";

import { useCallback, useEffect, useRef } from "react";
import { useFrame, useThree } from "@react-three/fiber";
import * as THREE from "three";

export interface OrbitControlsHandle {
  mouseButtons: {
    LEFT?: number;
    MIDDLE?: number;
    RIGHT?: number;
  };
  target: THREE.Vector3;
  update: () => void;
}

const MOVE_KEYS = new Set(["KeyW", "KeyA", "KeyS", "KeyD"]);
const VERTICAL_KEYS = new Set(["KeyQ", "KeyE"]);
const SHIFT_KEYS = new Set(["ShiftLeft", "ShiftRight"]);
const CAMERA_MOVE_SPEED = 8;

export function KeyboardCameraControls({
  controlsRef,
  disabled = false,
}: {
  controlsRef: { current: OrbitControlsHandle | null };
  disabled?: boolean;
}) {
  const { camera, gl } = useThree();
  const pressedKeys = useRef(new Set<string>());
  const rightMouseButtonDown = useRef(false);
  const forward = useRef(new THREE.Vector3());
  const right = useRef(new THREE.Vector3());
  const movement = useRef(new THREE.Vector3());

  const clearPressedKeys = useCallback(() => pressedKeys.current.clear(), []);

  useEffect(() => {
    const isEditingText = (target: EventTarget | null) => {
      if (!(target instanceof HTMLElement)) return false;
      return target.tagName === "INPUT" || target.tagName === "TEXTAREA" || target.isContentEditable;
    };
    const handleKeyDown = (event: KeyboardEvent) => {
      if (isEditingText(event.target)) return;
      if (!MOVE_KEYS.has(event.code) && !VERTICAL_KEYS.has(event.code) && !SHIFT_KEYS.has(event.code)) return;
      if (MOVE_KEYS.has(event.code) || VERTICAL_KEYS.has(event.code)) event.preventDefault();
      pressedKeys.current.add(event.code);
    };
    const handleKeyUp = (event: KeyboardEvent) => {
      pressedKeys.current.delete(event.code);
    };
    const handlePointerDown = (event: PointerEvent) => {
      if (event.button === 2) rightMouseButtonDown.current = true;
      if (event.button === 1) event.preventDefault();
      if (event.button === 0 && controlsRef.current) {
        controlsRef.current.mouseButtons.LEFT = event.altKey ? THREE.MOUSE.ROTATE : undefined;
      }
    };
    const handlePointerUp = (event: PointerEvent) => {
      if (event.button === 2) rightMouseButtonDown.current = false;
      if (event.button === 0 && controlsRef.current) controlsRef.current.mouseButtons.LEFT = undefined;
    };
    const handleContextMenu = (event: MouseEvent) => {
      if (rightMouseButtonDown.current) event.preventDefault();
    };
    const handleMouseDown = (event: MouseEvent) => {
      if (event.button === 2) rightMouseButtonDown.current = true;
      if (event.button === 1) event.preventDefault();
    };
    const handleMouseUp = (event: MouseEvent) => {
      if (event.button === 2) rightMouseButtonDown.current = false;
    };
    const handleMouseMove = (event: MouseEvent) => {
      rightMouseButtonDown.current = (event.buttons & 2) !== 0;
    };
    const handleAuxClick = (event: MouseEvent) => {
      if (event.button === 1) event.preventDefault();
    };
    const clearInputState = () => {
      rightMouseButtonDown.current = false;
      clearPressedKeys();
      if (controlsRef.current) controlsRef.current.mouseButtons.LEFT = undefined;
    };

    window.addEventListener("keydown", handleKeyDown);
    window.addEventListener("keyup", handleKeyUp);
    gl.domElement.addEventListener("pointerdown", handlePointerDown, true);
    window.addEventListener("pointerup", handlePointerUp);
    gl.domElement.addEventListener("contextmenu", handleContextMenu);
    gl.domElement.addEventListener("mousedown", handleMouseDown, true);
    window.addEventListener("mouseup", handleMouseUp);
    window.addEventListener("mousemove", handleMouseMove);
    gl.domElement.addEventListener("auxclick", handleAuxClick, true);
    window.addEventListener("blur", clearInputState);
    return () => {
      window.removeEventListener("keydown", handleKeyDown);
      window.removeEventListener("keyup", handleKeyUp);
      gl.domElement.removeEventListener("pointerdown", handlePointerDown, true);
      window.removeEventListener("pointerup", handlePointerUp);
      gl.domElement.removeEventListener("contextmenu", handleContextMenu);
      gl.domElement.removeEventListener("mousedown", handleMouseDown, true);
      window.removeEventListener("mouseup", handleMouseUp);
      window.removeEventListener("mousemove", handleMouseMove);
      gl.domElement.removeEventListener("auxclick", handleAuxClick, true);
      window.removeEventListener("blur", clearInputState);
    };
  }, [clearPressedKeys, gl]);

  useFrame((_, delta) => {
    const controls = controlsRef.current;
    if (disabled || !controls || !rightMouseButtonDown.current || pressedKeys.current.size === 0) return;

    forward.current.copy(camera.getWorldDirection(forward.current));
    forward.current.y = 0;
    if (forward.current.lengthSq() < 1e-6) return;
    forward.current.normalize();
    right.current.crossVectors(forward.current, camera.up).normalize();
    movement.current.set(0, 0, 0);
    if (pressedKeys.current.has("KeyW")) movement.current.add(forward.current);
    if (pressedKeys.current.has("KeyS")) movement.current.sub(forward.current);
    if (pressedKeys.current.has("KeyA")) movement.current.sub(right.current);
    if (pressedKeys.current.has("KeyD")) movement.current.add(right.current);
    if (pressedKeys.current.has("KeyQ")) movement.current.y -= 1;
    if (pressedKeys.current.has("KeyE")) movement.current.y += 1;
    if (movement.current.lengthSq() < 1e-6) return;

    const speedMultiplier = pressedKeys.current.has("ShiftLeft") || pressedKeys.current.has("ShiftRight") ? 2 : 1;
    movement.current.normalize().multiplyScalar(CAMERA_MOVE_SPEED * speedMultiplier * delta);
    camera.position.add(movement.current);
    controls.target.add(movement.current);
    controls.update();
  });

  return null;
}
