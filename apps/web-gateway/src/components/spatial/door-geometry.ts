import type { ExhibitionDoorType, ExhibitionSceneDoor, SceneWall } from "@atelier/contracts";

export const SINGLE_DOOR_WIDTH = 0.95;
export const DOUBLE_DOOR_WIDTH = 1.8;
export const DOOR_HEIGHT = 2.2;
export const DOOR_EDGE_CLEARANCE = 0.12;
export const DOOR_MAX_OPEN_ANGLE = Math.PI / 2;

export function doorWidth(type: ExhibitionDoorType) {
  return type === "double" ? DOUBLE_DOOR_WIDTH : SINGLE_DOOR_WIDTH;
}

export function wallLength(wall: SceneWall) {
  return Math.hypot(wall.end[0] - wall.start[0], wall.end[1] - wall.start[1]);
}

export function doorOpening(wall: SceneWall, door: ExhibitionSceneDoor) {
  const length = wallLength(wall);
  const halfWidth = doorWidth(door.type) / 2;
  const center = Math.min(Math.max(door.along, 0), length);
  return {
    start: Math.max(0, center - halfWidth),
    end: Math.min(length, center + halfWidth),
    height: Math.min(DOOR_HEIGHT, Math.max(0.1, wall.height - 0.08)),
  };
}

export function clampDoorAlong(wall: SceneWall, along: number, type: ExhibitionDoorType) {
  const length = wallLength(wall);
  const halfWidth = doorWidth(type) / 2;
  const minimum = halfWidth + DOOR_EDGE_CLEARANCE;
  const maximum = length - minimum;
  if (!Number.isFinite(length) || maximum < minimum) return null;
  return Math.min(Math.max(along, minimum), maximum);
}

export function doorOverlapsExisting(
  wall: SceneWall,
  along: number,
  type: ExhibitionDoorType,
  doors: ExhibitionSceneDoor[],
) {
  const halfWidth = doorWidth(type) / 2 + DOOR_EDGE_CLEARANCE;
  return doors.some((door) => {
    if (door.wallId !== wall.id) return false;
    return Math.abs(door.along - along) < halfWidth + doorWidth(door.type) / 2;
  });
}

export function collisionWallsForDoors(
  walls: SceneWall[] | undefined,
  doors: ExhibitionSceneDoor[] | undefined,
  openDoorIds: ReadonlySet<string>,
) {
  if (!walls?.length || !doors?.length || !openDoorIds.size) return walls;

  return walls.flatMap((wall) => {
    const openings = doors
      .filter((door) => door.wallId === wall.id && openDoorIds.has(door.id))
      .map((door) => doorOpening(wall, door))
      .sort((a, b) => a.start - b.start);
    if (!openings.length) return [wall];

    const segments: SceneWall[] = [];
    let cursor = 0;
    openings.forEach((opening, index) => {
      if (opening.start > cursor) {
        segments.push({ ...wall, id: `${wall.id}:door-gap:${index}:before`, start: pointAlong(wall, cursor), end: pointAlong(wall, opening.start) });
      }
      cursor = Math.max(cursor, opening.end);
    });
    if (cursor < wallLength(wall)) {
      segments.push({ ...wall, id: `${wall.id}:door-gap:after`, start: pointAlong(wall, cursor), end: pointAlong(wall, wallLength(wall)) });
    }
    return segments;
  });
}

function pointAlong(wall: SceneWall, along: number): [number, number] {
  const length = wallLength(wall);
  if (!length) return wall.start;
  const ratio = along / length;
  return [
    wall.start[0] + (wall.end[0] - wall.start[0]) * ratio,
    wall.start[1] + (wall.end[1] - wall.start[1]) * ratio,
  ];
}

export function wallInwardNormal(wall: SceneWall, levelWalls: SceneWall[]): [number, number] {
  const length = wallLength(wall);
  if (!length) return [0, 1];
  const midpoint: [number, number] = [
    (wall.start[0] + wall.end[0]) / 2,
    (wall.start[1] + wall.end[1]) / 2,
  ];
  const centroid = levelWalls.reduce<[number, number]>(
    (sum, candidate) => [
      sum[0] + (candidate.start[0] + candidate.end[0]) / 2,
      sum[1] + (candidate.start[1] + candidate.end[1]) / 2,
    ],
    [0, 0],
  );
  if (levelWalls.length) {
    centroid[0] /= levelWalls.length;
    centroid[1] /= levelWalls.length;
  }
  const directionX = (wall.end[0] - wall.start[0]) / length;
  const directionZ = (wall.end[1] - wall.start[1]) / length;
  const left: [number, number] = [-directionZ, directionX];
  const toCentroid: [number, number] = [centroid[0] - midpoint[0], centroid[1] - midpoint[1]];
  return left[0] * toCentroid[0] + left[1] * toCentroid[1] >= 0 ? left : [-left[0], -left[1]];
}

export function doorCenter(wall: SceneWall, door: ExhibitionSceneDoor, levelWalls: SceneWall[], baseY: number) {
  const length = wallLength(wall);
  const directionX = length ? (wall.end[0] - wall.start[0]) / length : 1;
  const directionZ = length ? (wall.end[1] - wall.start[1]) / length : 0;
  const normal = wallInwardNormal(wall, levelWalls);
  const inset = wall.thickness / 2 + 0.035;
  return {
    position: [
      wall.start[0] + directionX * door.along + normal[0] * inset,
      baseY,
      wall.start[1] + directionZ * door.along + normal[1] * inset,
    ] as [number, number, number],
    rotationY: -Math.atan2(directionZ, directionX),
    inwardSign: normal[0] * -directionZ + normal[1] * directionX >= 0 ? 1 : -1,
  };
}

