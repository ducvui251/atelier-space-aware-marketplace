import { describe, expect, it } from "vitest";
import type { SceneWall } from "@atelier/contracts";
import { wallInwardNormal, wallTransformFor } from "./wall-placement-geometry";

function wall(id: string, start: [number, number], end: [number, number], thickness = 0.2): SceneWall {
  return { id, start, end, height: 3.2, thickness };
}

describe("wall placement geometry", () => {
  it("places a frame on the inward face of a horizontal wall", () => {
    const walls = [
      wall("front", [0, -2], [4, -2]),
      wall("back", [0, 2], [4, 2]),
    ];

    expect(wallInwardNormal(walls[0], walls)).toEqual([0, 1]);
    expect(wallTransformFor(walls[0], 2, walls)).toEqual({
      positionX: 2,
      positionY: 1.6,
      positionZ: -1.8,
      rotationY: 0,
    });
  });

  it("follows angled wall endpoints and rotates the artwork toward the room", () => {
    const walls = [
      wall("diagonal", [0, 0], [3, 3]),
      wall("opposite", [0, 4], [3, 7]),
    ];
    const transform = wallTransformFor(walls[0], Math.sqrt(18) / 2, walls);

    expect(transform.positionX).toBeCloseTo(1.3586, 4);
    expect(transform.positionZ).toBeCloseTo(1.6414, 4);
    expect(transform.rotationY).toBeCloseTo(-45, 4);
  });
});
