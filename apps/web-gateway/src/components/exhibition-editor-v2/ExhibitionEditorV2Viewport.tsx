"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { Canvas, useThree } from "@react-three/fiber";
import { Grid, Html, Line, OrbitControls } from "@react-three/drei";
import * as THREE from "three";
import type { ExhibitionSceneDoor, ExhibitionSceneLevel, ExhibitionSceneStyle, ExhibitionSceneWall, SceneWall } from "@atelier/contracts";
import type { ThreeEvent } from "@react-three/fiber";
import { CeilingMesh } from "@/components/spatial/CeilingMesh";
import { WallMesh } from "@/components/spatial/WallMesh";
import { DoorMesh } from "@/components/spatial/DoorMesh";
import type { DerivedRoofLoop } from "./roof-geometry";
import type { EditorTool, WallEndpoint } from "./editor-state";
import { EDITOR_WORKSPACE_SIZE } from "./editor-state";
import { materialPropertiesFor, resolveSceneStyle } from "./scene-style";
import { getWallMeshTransform } from "./wall-geometry";
import { KeyboardCameraControls, type OrbitControlsHandle } from "./KeyboardCameraControls";

interface ExhibitionEditorV2ViewportProps {
  level: ExhibitionSceneLevel;
  walls: ExhibitionSceneWall[];
  doors: ExhibitionSceneDoor[];
  tool?: EditorTool;
  roofLoops: DerivedRoofLoop[];
  showCeilings: boolean;
  style?: ExhibitionSceneStyle;
  readOnly?: boolean;
  selectedWallId: string | null;
  onSelectWall: (wallId: string) => void;
  onGroundPointerDown: (point: [number, number]) => void;
  onPlaceDoor?: (event: ThreeEvent<PointerEvent>, wall: SceneWall) => void;
  onBeginWallEndpointDrag: (wallId: string, endpoint: WallEndpoint) => void;
  onMoveWallEndpoint: (wallId: string, endpoint: WallEndpoint, point: [number, number]) => void;
  onEndWallEndpointDrag: () => void;
}

function Ground({ elevation, onPointerDown }: { elevation: number; onPointerDown: (point: [number, number]) => void }) {
  return (
    <mesh
      position={[0, elevation - 0.02, 0]}
      rotation={[-Math.PI / 2, 0, 0]}
      onPointerDown={(event) => {
        event.stopPropagation();
        onPointerDown([event.point.x, event.point.z]);
      }}
    >
      <planeGeometry args={[EDITOR_WORKSPACE_SIZE, EDITOR_WORKSPACE_SIZE]} />
      <meshBasicMaterial color="#ffffff" transparent opacity={0} depthWrite={false} />
    </mesh>
  );
}

function Floor({ elevation, color, roughness, metalness }: { elevation: number; color: string; roughness: number; metalness: number }) {
  return (
    <mesh position={[0, elevation - 0.04, 0]} rotation={[-Math.PI / 2, 0, 0]} receiveShadow>
      <planeGeometry args={[EDITOR_WORKSPACE_SIZE, EDITOR_WORKSPACE_SIZE]} />
      <meshStandardMaterial color={color} roughness={roughness} metalness={metalness} />
    </mesh>
  );
}

const WORKSPACE_BOUNDARY_POINTS: [number, number, number][] = [
  [-EDITOR_WORKSPACE_SIZE / 2, 0, -EDITOR_WORKSPACE_SIZE / 2],
  [EDITOR_WORKSPACE_SIZE / 2, 0, -EDITOR_WORKSPACE_SIZE / 2],
  [EDITOR_WORKSPACE_SIZE / 2, 0, EDITOR_WORKSPACE_SIZE / 2],
  [-EDITOR_WORKSPACE_SIZE / 2, 0, EDITOR_WORKSPACE_SIZE / 2],
  [-EDITOR_WORKSPACE_SIZE / 2, 0, -EDITOR_WORKSPACE_SIZE / 2],
];

function WorkspaceBoundary({ elevation }: { elevation: number }) {
  return (
    <Line
      points={WORKSPACE_BOUNDARY_POINTS}
      position={[0, elevation + 0.02, 0]}
      color="#52677b"
      lineWidth={1.5}
    />
  );
}

function DimensionOverlay({ wall, baseY }: { wall: ExhibitionSceneWall; baseY: number }) {
  const transform = getWallMeshTransform(wall, baseY);
  if (!transform) return null;

  const [startX, startZ] = wall.start;
  const [endX, endZ] = wall.end;
  const dx = endX - startX;
  const dz = endZ - startZ;
  const length = transform.length;
  const normalX = -dz / length;
  const normalZ = dx / length;
  const offset = Math.max(wall.thickness * 2, 0.35);
  const tickHalfLength = 0.2;
  const y = baseY + 0.12;
  const dimensionStart: [number, number, number] = [startX + normalX * offset, y, startZ + normalZ * offset];
  const dimensionEnd: [number, number, number] = [endX + normalX * offset, y, endZ + normalZ * offset];
  const startTickA: [number, number, number] = [dimensionStart[0] - normalX * tickHalfLength, y, dimensionStart[2] - normalZ * tickHalfLength];
  const startTickB: [number, number, number] = [dimensionStart[0] + normalX * tickHalfLength, y, dimensionStart[2] + normalZ * tickHalfLength];
  const endTickA: [number, number, number] = [dimensionEnd[0] - normalX * tickHalfLength, y, dimensionEnd[2] - normalZ * tickHalfLength];
  const endTickB: [number, number, number] = [dimensionEnd[0] + normalX * tickHalfLength, y, dimensionEnd[2] + normalZ * tickHalfLength];
  const labelPosition: [number, number, number] = [(dimensionStart[0] + dimensionEnd[0]) / 2, y + 0.04, (dimensionStart[2] + dimensionEnd[2]) / 2];

  return (
    <group renderOrder={10}>
      <Line points={[dimensionStart, dimensionEnd]} color="#ffffff" lineWidth={2.5} depthTest={false} />
      <Line points={[startTickA, startTickB]} color="#ffffff" lineWidth={2.5} depthTest={false} />
      <Line points={[endTickA, endTickB]} color="#ffffff" lineWidth={2.5} depthTest={false} />
      <Html position={labelPosition} center zIndexRange={[20, 0]}>
        <div
          aria-label={`${length.toFixed(1)} meters`}
          style={{
            background: "rgba(15, 23, 42, 0.9)",
            border: "1px solid rgba(255, 255, 255, 0.75)",
            borderRadius: 4,
            color: "#ffffff",
            fontSize: 12,
            fontWeight: 600,
            padding: "2px 5px",
            pointerEvents: "none",
            whiteSpace: "nowrap",
          }}
        >
          {length.toFixed(1)} m
        </div>
      </Html>
    </group>
  );
}

interface DragTarget {
  wallId: string;
  endpoint: WallEndpoint;
}

function ExhibitionEditorScene({
  level,
  walls,
  doors,
  tool = "select",
  roofLoops,
  showCeilings,
  style,
  readOnly = false,
  selectedWallId,
  onSelectWall,
  onGroundPointerDown,
  onPlaceDoor,
  onBeginWallEndpointDrag,
  onMoveWallEndpoint,
  onEndWallEndpointDrag,
}: ExhibitionEditorV2ViewportProps) {
  const { camera, gl } = useThree();
  const [dragTarget, setDragTarget] = useState<DragTarget | null>(null);
  const dragTargetRef = useRef<DragTarget | null>(null);
  const orbitControlsRef = useRef<OrbitControlsHandle | null>(null);
  const raycaster = useRef(new THREE.Raycaster());
  const pointer = useRef(new THREE.Vector2());
  const groundPlane = useRef(new THREE.Plane());
  const intersection = useRef(new THREE.Vector3());
  const sceneStyle = resolveSceneStyle(style);
  const wallMaterial = materialPropertiesFor(sceneStyle.wallMaterial);
  const floorMaterial = materialPropertiesFor(sceneStyle.floorMaterial);

  const setOrbitControlsRef = useCallback((instance: OrbitControlsHandle | null) => {
    orbitControlsRef.current = instance;
  }, []);

  const getGroundPoint = useCallback((event: PointerEvent): [number, number] | null => {
    const bounds = gl.domElement.getBoundingClientRect();
    pointer.current.set(
      ((event.clientX - bounds.left) / bounds.width) * 2 - 1,
      -((event.clientY - bounds.top) / bounds.height) * 2 + 1,
    );
    raycaster.current.setFromCamera(pointer.current, camera);
    groundPlane.current.set(new THREE.Vector3(0, 1, 0), -level.elevation);
    const point = raycaster.current.ray.intersectPlane(groundPlane.current, intersection.current);
    return point ? [point.x, point.z] : null;
  }, [camera, gl, level.elevation]);

  useEffect(() => {
    if (!dragTarget) return undefined;

    const handlePointerMove = (event: PointerEvent) => {
      const point = getGroundPoint(event);
      if (point) onMoveWallEndpoint(dragTarget.wallId, dragTarget.endpoint, point);
    };
    const finishDrag = () => {
      dragTargetRef.current = null;
      setDragTarget(null);
      onEndWallEndpointDrag();
    };

    window.addEventListener("pointermove", handlePointerMove);
    window.addEventListener("pointerup", finishDrag, { once: true });
    window.addEventListener("pointercancel", finishDrag, { once: true });
    return () => {
      window.removeEventListener("pointermove", handlePointerMove);
      window.removeEventListener("pointerup", finishDrag);
      window.removeEventListener("pointercancel", finishDrag);
    };
  }, [dragTarget, getGroundPoint, onEndWallEndpointDrag, onMoveWallEndpoint]);

  function beginEndpointDrag(wallId: string, endpoint: WallEndpoint) {
    const target = { wallId, endpoint };
    dragTargetRef.current = target;
    setDragTarget(target);
    onBeginWallEndpointDrag(wallId, endpoint);
  }

  return (
    <>
      <color attach="background" args={[sceneStyle.environmentColor]} />
      <ambientLight intensity={sceneStyle.ambientLightIntensity} color={sceneStyle.lightColor} />
      <directionalLight position={[6, 12, 6]} intensity={sceneStyle.directionalLightIntensity} color={sceneStyle.lightColor} castShadow />
      <Grid
        args={[EDITOR_WORKSPACE_SIZE, EDITOR_WORKSPACE_SIZE]}
        position={[0, level.elevation, 0]}
        cellSize={1}
        sectionSize={5}
        cellColor="#6f93c0"
        sectionColor="#91b8de"
        cellThickness={0.8}
        sectionThickness={1.25}
        side={THREE.DoubleSide}
        fadeDistance={EDITOR_WORKSPACE_SIZE * 3}
        fadeStrength={0.7}
      />
      <WorkspaceBoundary elevation={level.elevation} />
      <Floor elevation={level.elevation} color={sceneStyle.floorColor} {...floorMaterial} />
      <Ground elevation={level.elevation} onPointerDown={readOnly ? () => undefined : onGroundPointerDown} />
      {showCeilings ? roofLoops.map((loop) => <CeilingMesh key={`${loop.levelId}:${loop.wallIds.join("|")}`} loop={loop} color={sceneStyle.ceilingColor} {...wallMaterial} />) : null}
      {walls.map((wall) => (
        <WallMesh
          key={wall.id}
          wall={wall}
          doors={doors.filter((door) => door.wallId === wall.id)}
          wallColor={sceneStyle.wallColor}
          selected={!readOnly && wall.id === selectedWallId}
          baseY={level.elevation}
          onSelect={readOnly || tool === "door" ? undefined : () => onSelectWall(wall.id)}
          onWallPointerDown={readOnly ? undefined : tool === "door" ? onPlaceDoor : undefined}
          onBeginEndpointDrag={readOnly ? undefined : (endpoint) => beginEndpointDrag(wall.id, endpoint)}
          {...wallMaterial}
        />
      ))}
      {doors.map((door) => {
        const wall = walls.find((candidate) => candidate.id === door.wallId);
        return wall ? <DoorMesh key={door.id} door={door} wall={wall} levelWalls={walls} baseY={level.elevation} /> : null;
      })}
      {!readOnly && selectedWallId ? (() => {
        const selectedWall = walls.find((wall) => wall.id === selectedWallId);
        return selectedWall ? <DimensionOverlay wall={selectedWall} baseY={level.elevation} /> : null;
      })() : null}
      <KeyboardCameraControls controlsRef={orbitControlsRef} disabled={Boolean(dragTarget)} />
      <OrbitControls
        ref={setOrbitControlsRef}
        enableDamping
        enablePan
        enableZoom
        enabled={!dragTarget}
        makeDefault
        mouseButtons={{ MIDDLE: THREE.MOUSE.PAN, RIGHT: THREE.MOUSE.ROTATE }}
        target={[0, level.elevation, 0]}
        minDistance={4}
        maxDistance={160}
      />
    </>
  );
}

export function ExhibitionEditorV2Viewport(props: ExhibitionEditorV2ViewportProps) {
  return (
    <Canvas dpr={[1, 1.5]} camera={{ position: [56, 40, 56], fov: 48, near: 0.1, far: 240 }}>
      <ExhibitionEditorScene {...props} />
    </Canvas>
  );
}
