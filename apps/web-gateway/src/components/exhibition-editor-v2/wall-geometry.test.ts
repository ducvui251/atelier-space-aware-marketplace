import { describe, expect, it } from "vitest";
import type { SceneWall } from "@atelier/contracts";
import { getWallMeshTransform } from "./wall-geometry";

function wall(overrides: Partial<SceneWall> = {}): SceneWall {
  return {
    id: "wall",
    start: [0, 0],
    end: [3, 4],
    height: 4,
    thickness: 0.15,
    ...overrides,
  };
}

describe("wall mesh geometry", () => {
  it("keeps height on Y while mapping endpoints to XZ", () => {
    expect(getWallMeshTransform(wall(), 2)).toEqual({
      position: [1.5, 4, 2],
      rotation: [0, -Math.atan2(4, 3), 0],
      size: [5, 4, 0.15],
      length: 5,
    });
  });

  it("drops collapsed or invalid wall boxes", () => {
    expect(getWallMeshTransform(wall({ end: [0, 0] }))).toBeNull();
    expect(getWallMeshTransform(wall({ height: 0 }))).toBeNull();
    expect(getWallMeshTransform(wall({ thickness: 0 }))).toBeNull();
  });
});
