import type { SceneWall } from "@atelier/contracts";
import { MIN_RENDERABLE_WALL_LENGTH } from "./wall-geometry";

export const WALL_INSET = 0.1;
export const DEFAULT_ARTWORK_HEIGHT = 1.6;

export interface WallPlacementTransform {
  positionX: number;
  positionY: number;
  positionZ: number;
  rotationY: number;
}

export function wallLength(wall: SceneWall) {
  return Math.hypot(wall.end[0] - wall.start[0], wall.end[1] - wall.start[1]);
}

/**
 * Returns the normal facing the centre of the wall group. This is exact for a
 * single convex room; concave or multi-room layouts need loop-aware normals.
 */
export function wallInwardNormal(wall: SceneWall, levelWalls: SceneWall[]): [number, number] {
  const length = wallLength(wall);
  if (!Number.isFinite(length) || length < MIN_RENDERABLE_WALL_LENGTH) return [0, 1];

  const midpoint: [number, number] = [
    (wall.start[0] + wall.end[0]) / 2,
    (wall.start[1] + wall.end[1]) / 2,
  ];
  const validWalls = levelWalls.filter((candidate) => {
    const candidateLength = wallLength(candidate);
    return Number.isFinite(candidateLength) && candidateLength >= MIN_RENDERABLE_WALL_LENGTH;
  });
  if (!validWalls.length) return [0, 1];

  const centroid = validWalls.reduce<[number, number]>(
    (sum, candidate) => [
      sum[0] + (candidate.start[0] + candidate.end[0]) / 2,
      sum[1] + (candidate.start[1] + candidate.end[1]) / 2,
    ],
    [0, 0],
  ).map((value) => value / validWalls.length) as [number, number];

  const dx = (wall.end[0] - wall.start[0]) / length;
  const dz = (wall.end[1] - wall.start[1]) / length;
  const left: [number, number] = [-dz || 0, dx || 0];
  const toCentroid: [number, number] = [centroid[0] - midpoint[0], centroid[1] - midpoint[1]];
  const pointsTowardCentroid = left[0] * toCentroid[0] + left[1] * toCentroid[1] >= 0;
  return pointsTowardCentroid ? left : [-left[0], -left[1]];
}

/** Maps a distance along a wall to an interior-facing artwork transform. */
export function wallTransformFor(wall: SceneWall, along: number, levelWalls: SceneWall[]): WallPlacementTransform {
  const length = wallLength(wall);
  if (!Number.isFinite(length) || length < MIN_RENDERABLE_WALL_LENGTH) {
    return {
      positionX: wall.start[0],
      positionY: DEFAULT_ARTWORK_HEIGHT,
      positionZ: wall.start[1],
      rotationY: 0,
    };
  }

  const distance = Number.isFinite(along) ? Math.min(Math.max(along, 0), length) : length / 2;
  const directionX = (wall.end[0] - wall.start[0]) / length;
  const directionZ = (wall.end[1] - wall.start[1]) / length;
  const normal = wallInwardNormal(wall, levelWalls);
  const inset = wall.thickness / 2 + WALL_INSET;

  return {
    positionX: wall.start[0] + directionX * distance + normal[0] * inset,
    positionY: DEFAULT_ARTWORK_HEIGHT,
    positionZ: wall.start[1] + directionZ * distance + normal[1] * inset,
    // ArtworkMesh's local +Z is its visible face. Rotate it toward the room.
    rotationY: (Math.atan2(normal[0], normal[1]) * 180) / Math.PI,
  };
}
