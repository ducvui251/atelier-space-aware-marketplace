import type { SceneWall } from "@atelier/contracts";

export const MIN_RENDERABLE_WALL_LENGTH = 0.01;

export interface WallMeshTransform {
  position: [number, number, number];
  rotation: [number, number, number];
  size: [number, number, number];
  length: number;
}

/** Maps the editor's [x, z] segment into an upright Three.js box. */
export function getWallMeshTransform(wall: SceneWall, baseY = 0): WallMeshTransform | null {
  const [startX, startZ] = wall.start;
  const [endX, endZ] = wall.end;
  const dx = endX - startX;
  const dz = endZ - startZ;
  const length = Math.hypot(dx, dz);

  if (
    !Number.isFinite(length) ||
    length < MIN_RENDERABLE_WALL_LENGTH ||
    !Number.isFinite(wall.height) ||
    wall.height <= 0 ||
    !Number.isFinite(wall.thickness) ||
    wall.thickness <= 0
  ) {
    return null;
  }

  return {
    position: [(startX + endX) / 2, baseY + wall.height / 2, (startZ + endZ) / 2],
    // BoxGeometry's long axis is local X. Three.js rotates local +X toward
    // world +Z with a negative Y angle.
    rotation: [0, -Math.atan2(dz, dx), 0],
    size: [length, wall.height, wall.thickness],
    length,
  };
}
