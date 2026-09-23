import { describe, expect, it } from "vitest";
import { clampPointToWorkspace, createDefaultScene, createInitialEditorState, createSceneFromExhibition, editorReducer, snapPoint } from "./editor-state";

describe("Exhibition Editor V2 state", () => {
  it("loads the legacy four-wall box when an exhibition has no scene document", () => {
    const scene = createSceneFromExhibition({});

    expect(scene.levels[0]?.floor).toEqual({ width: 10, depth: 10 });
    expect(scene.walls.map((wall) => wall.id)).toEqual(["front", "back", "left", "right"]);
    expect(scene.walls.every((wall) => wall.levelId === "ground-level")).toBe(true);
  });

  it("preserves legacy custom wall segments when adapting an exhibition", () => {
    const scene = createSceneFromExhibition({
      roomWidth: 8,
      roomDepth: 6,
      wallSegments: [{ id: "custom", start: [-1, 0], end: [1, 0], height: 3.2, thickness: 0.15 }],
    });

    expect(scene.levels[0]?.floor).toEqual({ width: 8, depth: 6 });
    expect(scene.walls).toEqual([{ id: "custom", start: [-1, 0], end: [1, 0], height: 3.2, thickness: 0.15, levelId: "ground-level" }]);
  });

  it("creates a snapped wall and supports undo/redo", () => {
    let state = createInitialEditorState();
    state = editorReducer(state, { type: "place-wall-point", point: snapPoint([0.2, 0.2]) });
    state = editorReducer(state, { type: "place-wall-point", point: snapPoint([4.1, 0.2]) });

    expect(state.scene.walls).toHaveLength(1);
    expect(state.scene.walls[0]?.start).toEqual([0, 0]);
    expect(state.scene.walls[0]?.end).toEqual([4, 0]);

    state = editorReducer(state, { type: "undo" });
    expect(state.scene.walls).toHaveLength(0);
    state = editorReducer(state, { type: "redo" });
    expect(state.scene.walls).toHaveLength(1);
  });

  it("stores style changes in the scene and supports undo", () => {
    let state = createInitialEditorState();
    state = editorReducer(state, { type: "update-style", patch: { wallColor: "#123456", wallMaterial: "polished" } });

    expect(state.scene.style).toMatchObject({ wallColor: "#123456", wallMaterial: "polished" });
    state = editorReducer(state, { type: "undo" });
    expect(state.scene.style).toBeUndefined();
  });

  it("moves an endpoint as one undoable drag operation", () => {
    let state = createInitialEditorState({
      ...createDefaultScene(),
      walls: [{ id: "wall-1", levelId: "ground-level", start: [0, 0], end: [4, 0], height: 4, thickness: 0.15 }],
    });

    state = editorReducer(state, { type: "begin-wall-drag", wallId: "wall-1" });
    state = editorReducer(state, { type: "preview-wall-endpoint", wallId: "wall-1", endpoint: "end", point: [2, 2] });
    state = editorReducer(state, { type: "preview-wall-endpoint", wallId: "wall-1", endpoint: "end", point: [3, 3] });
    state = editorReducer(state, { type: "end-wall-drag" });

    expect(state.scene.walls[0]?.end).toEqual([3, 3]);
    state = editorReducer(state, { type: "undo" });
    expect(state.scene.walls[0]?.end).toEqual([4, 0]);
    state = editorReducer(state, { type: "redo" });
    expect(state.scene.walls[0]?.end).toEqual([3, 3]);
  });

  it("keeps an endpoint above the minimum wall length", () => {
    let state = createInitialEditorState({
      ...createDefaultScene(),
      walls: [{ id: "wall-1", levelId: "ground-level", start: [0, 0], end: [4, 0], height: 4, thickness: 0.15 }],
    });
    state = editorReducer(state, { type: "begin-wall-drag", wallId: "wall-1" });
    state = editorReducer(state, { type: "preview-wall-endpoint", wallId: "wall-1", endpoint: "end", point: [0.1, 0.1] });

    expect(state.scene.walls[0]?.end).toEqual([4, 0]);
  });

  it("clamps new walls and endpoint edits to the 50m workspace boundary", () => {
    expect(clampPointToWorkspace([30, -40])).toEqual([25, -25]);

    let state = createInitialEditorState();
    state = editorReducer(state, { type: "place-wall-point", point: [30, 0] });
    state = editorReducer(state, { type: "place-wall-point", point: [0, 30] });

    expect(state.scene.walls[0]?.start).toEqual([25, 0]);
    expect(state.scene.walls[0]?.end).toEqual([0, 25]);

    state = editorReducer(state, { type: "begin-wall-drag", wallId: state.scene.walls[0]!.id });
    state = editorReducer(state, { type: "preview-wall-endpoint", wallId: state.scene.walls[0]!.id, endpoint: "end", point: [-40, 40] });

    expect(state.scene.walls[0]?.end).toEqual([-25, 25]);
  });

  it("normalizes loaded wall endpoints into the workspace", () => {
    const state = createInitialEditorState({
      ...createDefaultScene(),
      walls: [{ id: "wall-1", levelId: "ground-level", start: [-40, 0], end: [40, 0], height: 4, thickness: 0.15 }],
    });

    expect(state.scene.walls[0]?.start).toEqual([-25, 0]);
    expect(state.scene.walls[0]?.end).toEqual([25, 0]);
  });

  it("makes duplicate wall ids unique so selection maps to one mesh", () => {
    const state = createInitialEditorState({
      ...createDefaultScene(),
      walls: [
        { id: "wall", levelId: "ground-level", start: [0, 0], end: [4, 0], height: 4, thickness: 0.15 },
        { id: "wall", levelId: "ground-level", start: [0, 2], end: [4, 2], height: 4, thickness: 0.15 },
      ],
    });

    expect(state.scene.walls.map((wall) => wall.id)).toEqual(["wall", "wall-2"]);
  });

  it("rejects numeric edits that collapse a wall", () => {
    const state = createInitialEditorState({
      ...createDefaultScene(),
      walls: [{ id: "wall-1", levelId: "ground-level", start: [0, 0], end: [4, 0], height: 4, thickness: 0.15 }],
    });

    const next = editorReducer(state, { type: "update-wall", wallId: "wall-1", patch: { end: [0, 0] } });
    expect(next).toBe(state);
  });
});
