import type { ExhibitionSceneDocument, ExhibitionSceneLevel, ExhibitionSceneWall } from "@atelier/contracts";
import { snapPoint, type Point2D } from "./editor-state";

export const DEFAULT_ROOF_SNAP_GRID_SIZE = 0.5;
export const DEFAULT_ROOF_ENDPOINT_TOLERANCE = 0.1;

export interface RoofGeometryOptions {
  snapGridSize?: number;
  endpointTolerance?: number;
}

export interface NormalizedRoofWall {
  id: string;
  levelId: string;
  start: Point2D;
  end: Point2D;
  height: number;
  thickness: number;
}

export interface DerivedRoofLoop {
  levelId: string;
  wallIds: string[];
  points: Point2D[];
  minimumWallHeight: number;
  ceilingElevation: number;
}

interface GraphWall extends NormalizedRoofWall {
  startNode: number;
  endNode: number;
}

interface EndpointNode {
  point: Point2D;
  wallIndexes: number[];
}

function isFinitePoint(point: Point2D): boolean {
  return Number.isFinite(point[0]) && Number.isFinite(point[1]);
}

function distanceBetween(a: Point2D, b: Point2D): number {
  return Math.hypot(b[0] - a[0], b[1] - a[1]);
}

function isValidNumber(value: number): boolean {
  return Number.isFinite(value) && value > 0;
}

function normalizeEndpoint(point: Point2D, snapGridSize: number, tolerance: number): Point2D {
  const snapped = snapPoint(point, snapGridSize);
  return distanceBetween(point, snapped) <= tolerance ? snapped : point;
}

function getOrCreateNode(nodes: EndpointNode[], point: Point2D, tolerance: number): number {
  const existingIndex = nodes.findIndex((node) => distanceBetween(node.point, point) <= tolerance);
  if (existingIndex >= 0) return existingIndex;

  nodes.push({ point, wallIndexes: [] });
  return nodes.length - 1;
}

/**
 * Normalizes editor wall endpoints, drops malformed/zero-length walls, and
 * keeps the result derived from the current wall payload.
 */
export function normalizeRoofWalls(
  walls: readonly ExhibitionSceneWall[],
  options: RoofGeometryOptions = {},
): NormalizedRoofWall[] {
  const snapGridSize = options.snapGridSize ?? DEFAULT_ROOF_SNAP_GRID_SIZE;
  const endpointTolerance = options.endpointTolerance ?? DEFAULT_ROOF_ENDPOINT_TOLERANCE;
  if (!isValidNumber(snapGridSize) || !isValidNumber(endpointTolerance)) return [];

  return walls.flatMap((wall) => {
    if (
      typeof wall.id !== "string" ||
      typeof wall.levelId !== "string" ||
      !isFinitePoint(wall.start) ||
      !isFinitePoint(wall.end) ||
      !isValidNumber(wall.height) ||
      !isValidNumber(wall.thickness)
    ) {
      return [];
    }

    const start = normalizeEndpoint(wall.start, snapGridSize, endpointTolerance);
    const end = normalizeEndpoint(wall.end, snapGridSize, endpointTolerance);
    if (distanceBetween(start, end) <= endpointTolerance) return [];

    return [{ id: wall.id, levelId: wall.levelId, start, end, height: wall.height, thickness: wall.thickness }];
  });
}

function orientation(a: Point2D, b: Point2D, c: Point2D): number {
  return (b[0] - a[0]) * (c[1] - a[1]) - (b[1] - a[1]) * (c[0] - a[0]);
}

function isBetween(value: number, start: number, end: number): boolean {
  return value >= Math.min(start, end) && value <= Math.max(start, end);
}

function pointsEqual(a: Point2D, b: Point2D, tolerance: number): boolean {
  return distanceBetween(a, b) <= tolerance;
}

function segmentsIntersect(a: Point2D, b: Point2D, c: Point2D, d: Point2D, tolerance: number): boolean {
  const ab = orientation(a, b, c);
  const cd = orientation(a, b, d);
  const ac = orientation(c, d, a);
  const ad = orientation(c, d, b);
  const epsilon = tolerance * Math.max(1, distanceBetween(a, b), distanceBetween(c, d));

  if (Math.abs(ab) <= epsilon && isBetween(c[0], a[0] - tolerance, b[0] + tolerance) && isBetween(c[1], a[1] - tolerance, b[1] + tolerance)) return true;
  if (Math.abs(cd) <= epsilon && isBetween(d[0], a[0] - tolerance, b[0] + tolerance) && isBetween(d[1], a[1] - tolerance, b[1] + tolerance)) return true;
  if (Math.abs(ac) <= epsilon && isBetween(a[0], c[0] - tolerance, d[0] + tolerance) && isBetween(a[1], c[1] - tolerance, d[1] + tolerance)) return true;
  if (Math.abs(ad) <= epsilon && isBetween(b[0], c[0] - tolerance, d[0] + tolerance) && isBetween(b[1], c[1] - tolerance, d[1] + tolerance)) return true;

  return (ab > epsilon) !== (cd > epsilon) && (ac > epsilon) !== (ad > epsilon);
}

function isSimpleLoop(points: readonly Point2D[], tolerance: number): boolean {
  if (points.length < 3) return false;

  const area = points.reduce((sum, point, index) => {
    const next = points[(index + 1) % points.length];
    return sum + point[0] * next[1] - next[0] * point[1];
  }, 0);
  if (Math.abs(area) <= tolerance * tolerance) return false;

  for (let first = 0; first < points.length; first += 1) {
    const firstEnd = (first + 1) % points.length;
    for (let second = first + 1; second < points.length; second += 1) {
      const secondEnd = (second + 1) % points.length;
      if (first === second || firstEnd === second || secondEnd === first) continue;
      if (segmentsIntersect(points[first], points[firstEnd], points[second], points[secondEnd], tolerance)) return false;
    }
  }

  return points.every((point, index) => points.slice(index + 1).every((other) => !pointsEqual(point, other, tolerance)));
}

function getConnectedWallIndexes(walls: readonly GraphWall[], nodes: readonly EndpointNode[], startIndex: number): number[] {
  const component: number[] = [];
  const pending = [startIndex];
  const visited = new Set<number>();

  while (pending.length) {
    const wallIndex = pending.pop();
    if (wallIndex === undefined || visited.has(wallIndex)) continue;
    visited.add(wallIndex);
    component.push(wallIndex);
    const wall = walls[wallIndex];
    for (const nodeIndex of [wall.startNode, wall.endNode]) {
      for (const connectedIndex of nodes[nodeIndex]?.wallIndexes ?? []) {
        if (!visited.has(connectedIndex)) pending.push(connectedIndex);
      }
    }
  }

  return component;
}

function walkLoop(walls: readonly GraphWall[], nodes: readonly EndpointNode[], component: readonly number[]): { wallIds: string[]; points: Point2D[] } | null {
  const componentSet = new Set(component);
  const firstWall = walls[component[0]];
  if (!firstWall) return null;

  const wallIds: string[] = [];
  const points: Point2D[] = [nodes[firstWall.startNode].point];
  let currentNode = firstWall.startNode;
  let currentWallIndex = component[0];

  while (true) {
    const wall = walls[currentWallIndex];
    if (!wall || !componentSet.has(currentWallIndex)) return null;
    wallIds.push(wall.id);
    const nextNode = wall.startNode === currentNode ? wall.endNode : wall.startNode;
    points.push(nodes[nextNode].point);

    if (nextNode === firstWall.startNode) {
      points.pop();
      return { wallIds, points };
    }

    const nextWallIndex = nodes[nextNode]?.wallIndexes.find((index) => index !== currentWallIndex && componentSet.has(index));
    if (nextWallIndex === undefined) return null;
    currentNode = nextNode;
    currentWallIndex = nextWallIndex;
    if (wallIds.length > component.length) return null;
  }
}

function buildLevelLoops(walls: readonly NormalizedRoofWall[], level: ExhibitionSceneLevel, tolerance: number): DerivedRoofLoop[] {
  const levelWalls = walls.filter((wall) => wall.levelId === level.id);
  const nodes: EndpointNode[] = [];
  const graphWalls: GraphWall[] = levelWalls.map((wall) => {
    const startNode = getOrCreateNode(nodes, wall.start, tolerance);
    const endNode = getOrCreateNode(nodes, wall.end, tolerance);
    return { ...wall, startNode, endNode };
  }).filter((wall) => wall.startNode !== wall.endNode);

  nodes.forEach((node) => {
    node.wallIndexes = [];
  });
  graphWalls.forEach((wall, index) => {
    nodes[wall.startNode].wallIndexes.push(index);
    nodes[wall.endNode].wallIndexes.push(index);
  });

  const visited = new Set<number>();
  const loops: DerivedRoofLoop[] = [];
  graphWalls.forEach((_, startIndex) => {
    if (visited.has(startIndex)) return;
    const component = getConnectedWallIndexes(graphWalls, nodes, startIndex);
    component.forEach((index) => visited.add(index));
    if (component.length < 3 || component.some((index) => {
      const wall = graphWalls[index];
      return nodes[wall.startNode].wallIndexes.length !== 2 || nodes[wall.endNode].wallIndexes.length !== 2;
    })) return;

    const loop = walkLoop(graphWalls, nodes, component);
    if (!loop || !isSimpleLoop(loop.points, tolerance)) return;
    const minimumWallHeight = Math.min(...component.map((index) => graphWalls[index].height));
    if (!Number.isFinite(minimumWallHeight)) return;
    loops.push({
      levelId: level.id,
      wallIds: loop.wallIds,
      points: loop.points,
      minimumWallHeight,
      ceilingElevation: level.elevation + minimumWallHeight,
    });
  });

  return loops;
}

/** Returns one derived flat-roof boundary for each closed simple wall loop. */
export function deriveRoofLoops(scene: Pick<ExhibitionSceneDocument, "levels" | "walls">, options: RoofGeometryOptions = {}): DerivedRoofLoop[] {
  const endpointTolerance = options.endpointTolerance ?? DEFAULT_ROOF_ENDPOINT_TOLERANCE;
  if (!isValidNumber(endpointTolerance)) return [];
  const walls = normalizeRoofWalls(scene.walls, options);
  return scene.levels.flatMap((level) => buildLevelLoops(walls, level, endpointTolerance));
}

export const deriveClosedWallLoops = deriveRoofLoops;
