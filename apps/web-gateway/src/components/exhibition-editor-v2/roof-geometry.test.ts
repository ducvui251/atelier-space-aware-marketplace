import { describe, expect, it } from "vitest";
import type { ExhibitionSceneDocument, ExhibitionSceneWall } from "@atelier/contracts";
import { createSceneFromExhibition } from "./editor-state";
import { deriveRoofLoops } from "./roof-geometry";

const level = { id: "ground-level", name: "Ground level", elevation: 2, floor: { width: 20, depth: 20 } };

function wall(id: string, start: [number, number], end: [number, number], height = 4, levelId = level.id): ExhibitionSceneWall {
  return { id, levelId, start, end, height, thickness: 0.15 };
}

function scene(walls: ExhibitionSceneWall[], levels = [level]): ExhibitionSceneDocument {
  return { version: 1, activeLevelId: levels[0].id, levels, walls };
}

describe("derived roof geometry", () => {
  it("derives a ceiling for the pre-made room", () => {
    const loops = deriveRoofLoops(createSceneFromExhibition({ roomWidth: 10, roomDepth: 10, wallSegments: [] }));

    expect(loops).toHaveLength(1);
    expect(loops[0]?.ceilingElevation).toBe(3.2);
  });

  it("derives a closed rectangle at the minimum wall height", () => {
    const loops = deriveRoofLoops(scene([
      wall("south", [0, 0], [4, 0], 4),
      wall("east", [4, 0], [4, 3], 5),
      wall("north", [4, 3], [0, 3], 3.5),
      wall("west", [0, 3], [0, 0], 4.5),
    ]));

    expect(loops).toHaveLength(1);
    expect(loops[0]).toMatchObject({
      levelId: "ground-level",
      wallIds: ["south", "east", "north", "west"],
      minimumWallHeight: 3.5,
      ceilingElevation: 5.5,
    });
    expect(loops[0]?.points).toEqual([[0, 0], [4, 0], [4, 3], [0, 3]]);
  });

  it("does not derive a roof for an open boundary", () => {
    expect(deriveRoofLoops(scene([
      wall("south", [0, 0], [4, 0]),
      wall("east", [4, 0], [4, 3]),
      wall("north", [4, 3], [0, 3]),
    ]))).toEqual([]);
  });

  it("joins endpoints within the snapped tolerance", () => {
    const loops = deriveRoofLoops(scene([
      wall("south", [0, 0], [4, 0]),
      wall("east", [4.04, 0.02], [4, 3]),
      wall("north", [4, 3], [0, 3]),
      wall("west", [0, 3], [-0.03, -0.02]),
    ]));

    expect(loops).toHaveLength(1);
  });

  it("skips zero-length walls after endpoint normalization", () => {
    const loops = deriveRoofLoops(scene([
      wall("south", [0, 0], [4, 0]),
      wall("zero", [4.01, 0.01], [4.04, 0.02]),
      wall("east", [4, 0], [4, 3]),
      wall("north", [4, 3], [0, 3]),
      wall("west", [0, 3], [0, 0]),
    ]));

    expect(loops).toHaveLength(1);
    expect(loops[0]?.wallIds).not.toContain("zero");
  });

  it("derives independent rooms on the same level", () => {
    const loops = deriveRoofLoops(scene([
      wall("a-south", [0, 0], [2, 0]),
      wall("a-east", [2, 0], [2, 2]),
      wall("a-north", [2, 2], [0, 2]),
      wall("a-west", [0, 2], [0, 0]),
      wall("b-south", [5, 0], [7, 0]),
      wall("b-east", [7, 0], [7, 2]),
      wall("b-north", [7, 2], [5, 2]),
      wall("b-west", [5, 2], [5, 0]),
    ]));

    expect(loops).toHaveLength(2);
    expect(loops.map((loop) => loop.wallIds)).toEqual([
      ["a-south", "a-east", "a-north", "a-west"],
      ["b-south", "b-east", "b-north", "b-west"],
    ]);
  });

  it("keeps levels independent", () => {
    const upperLevel = { ...level, id: "upper-level", elevation: 8 };
    const loops = deriveRoofLoops(scene([
      wall("ground-south", [0, 0], [4, 0]),
      wall("ground-east", [4, 0], [4, 3]),
      wall("ground-north", [4, 3], [0, 3]),
      wall("ground-west", [0, 3], [0, 0]),
      wall("upper-south", [0, 0], [4, 0], 3, upperLevel.id),
      wall("upper-east", [4, 0], [4, 3], 3, upperLevel.id),
      wall("upper-north", [4, 3], [0, 3], 3, upperLevel.id),
      wall("upper-west", [0, 3], [0, 0], 3, upperLevel.id),
    ], [level, upperLevel]));

    expect(loops.map((loop) => loop.ceilingElevation)).toEqual([6, 11]);
  });

  it("rejects self-intersecting boundaries without throwing", () => {
    expect(deriveRoofLoops(scene([
      wall("one", [0, 0], [4, 3]),
      wall("two", [4, 3], [0, 3]),
      wall("three", [0, 3], [4, 0]),
      wall("four", [4, 0], [0, 0]),
    ]))).toEqual([]);
  });
});
