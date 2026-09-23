import { describe, expect, it } from "vitest";
import type { ExhibitionSceneDoor, SceneWall } from "@atelier/contracts";
import { clampDoorAlong, collisionWallsForDoors, doorOverlapsExisting } from "./door-geometry";

const wall: SceneWall = { id: "wall-1", start: [0, 0], end: [10, 0], height: 4, thickness: 0.15 };
const singleDoor: ExhibitionSceneDoor = { id: "door-1", levelId: "ground-level", wallId: wall.id, type: "single", along: 5 };

describe("door geometry", () => {
  it("keeps a door inside the wall with an edge clearance", () => {
    expect(clampDoorAlong(wall, 0, "single")).toBeCloseTo(0.595);
    expect(clampDoorAlong(wall, 10, "double")).toBeCloseTo(8.98);
  });

  it("rejects overlapping doors on the same wall", () => {
    expect(doorOverlapsExisting(wall, 5.2, "single", [singleDoor])).toBe(true);
    expect(doorOverlapsExisting(wall, 8, "single", [singleDoor])).toBe(false);
  });

  it("removes an open door opening from player collision", () => {
    const segments = collisionWallsForDoors([wall], [singleDoor], new Set([singleDoor.id]));
    expect(segments).toHaveLength(2);
    expect(segments?.[0].start[0]).toBeCloseTo(0);
    expect(segments?.[0].end[0]).toBeCloseTo(4.525);
    expect(segments?.[1].start[0]).toBeCloseTo(5.475);
    expect(segments?.[1].end[0]).toBeCloseTo(10);
  });
});

