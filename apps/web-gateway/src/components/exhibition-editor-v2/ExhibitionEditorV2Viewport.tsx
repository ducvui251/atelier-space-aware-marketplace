"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { Canvas, useThree } from "@react-three/fiber";
import { Grid, Line, OrbitControls } from "@react-three/drei";
import * as THREE from "three";
import type { ExhibitionSceneLevel, ExhibitionSceneWall } from "@atelier/contracts";
import { CeilingMesh } from "@/components/spatial/CeilingMesh";
import { WallMesh } from "@/components/spatial/WallMesh";
import type { DerivedRoofLoop } from "./roof-geometry";
import type { WallEndpoint } from "./editor-state";
import { EDITOR_WORKSPACE_SIZE } from "./editor-state";

interface ExhibitionEditorV2ViewportProps {
  level: ExhibitionSceneLevel;
  walls: ExhibitionSceneWall[];
  roofLoops: DerivedRoofLoop[];
  showCeilings: boolean;
  selectedWallId: string | null;
  onSelectWall: (wallId: string) => void;
  onGroundPointerDown: (point: [number, number]) => void;
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

interface DragTarget {
  wallId: string;
  endpoint: WallEndpoint;
}

function ExhibitionEditorScene({
  level,
  walls,
  roofLoops,
  showCeilings,
  selectedWallId,
  onSelectWall,
  onGroundPointerDown,
  onBeginWallEndpointDrag,
  onMoveWallEndpoint,
  onEndWallEndpointDrag,
}: ExhibitionEditorV2ViewportProps) {
  const { camera, gl } = useThree();
  const [dragTarget, setDragTarget] = useState<DragTarget | null>(null);
  const dragTargetRef = useRef<DragTarget | null>(null);
  const raycaster = useRef(new THREE.Raycaster());
  const pointer = useRef(new THREE.Vector2());
  const groundPlane = useRef(new THREE.Plane());
  const intersection = useRef(new THREE.Vector3());

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
      <color attach="background" args={["#b9d1ea"]} />
      <ambientLight intensity={1.5} />
      <directionalLight position={[6, 12, 6]} intensity={2.4} castShadow />
      <Grid
        args={[EDITOR_WORKSPACE_SIZE, EDITOR_WORKSPACE_SIZE]}
        position={[0, level.elevation, 0]}
        cellSize={0.5}
        sectionSize={5}
        sectionColor="#718096"
        cellColor="#a8b4c3"
        side={THREE.DoubleSide}
        fadeStrength={0}
      />
      <WorkspaceBoundary elevation={level.elevation} />
      <Ground elevation={level.elevation} onPointerDown={onGroundPointerDown} />
      {showCeilings ? roofLoops.map((loop) => <CeilingMesh key={`${loop.levelId}:${loop.wallIds.join("|")}`} loop={loop} color="#f7fafc" />) : null}
      {walls.map((wall) => (
        <WallMesh
          key={wall.id}
          wall={wall}
          wallColor="#f7fafc"
          selected={wall.id === selectedWallId}
          baseY={level.elevation}
          onSelect={() => onSelectWall(wall.id)}
          onBeginEndpointDrag={(endpoint) => beginEndpointDrag(wall.id, endpoint)}
        />
      ))}
      <OrbitControls
        enableDamping
        enablePan
        enableZoom
        enabled={!dragTarget}
        makeDefault
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
