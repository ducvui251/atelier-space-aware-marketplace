import type { Exhibition, ExhibitionDoorType, ExhibitionSceneDocument, ExhibitionSceneImagePlacement, ExhibitionSceneStyle, ExhibitionSceneWall } from "@atelier/contracts";
import { createExhibitionBoxWalls, EXHIBITION_BOX_DEPTH, EXHIBITION_BOX_WIDTH } from "../spatial/exhibition-box";
import { clampDoorAlong, doorOverlapsExisting } from "../spatial/door-geometry";
import { resolveSceneStyle } from "./scene-style";

export type EditorTool = "select" | "wall" | "door";
export type Point2D = [number, number];
export type WallEndpoint = "start" | "end";

export const EDITOR_WORKSPACE_SIZE = 50;
export const EDITOR_WORKSPACE_HALF_SIZE = EDITOR_WORKSPACE_SIZE / 2;

export interface EditorState {
  scene: ExhibitionSceneDocument;
  tool: EditorTool;
  selectedWallId: string | null;
  pendingWallStart: Point2D | null;
  past: ExhibitionSceneDocument[];
  future: ExhibitionSceneDocument[];
  dragStartScene: ExhibitionSceneDocument | null;
}

export type EditorAction =
  | { type: "load"; scene: ExhibitionSceneDocument }
  | { type: "set-tool"; tool: EditorTool }
  | { type: "set-active-level"; levelId: string }
  | { type: "add-level" }
  | { type: "begin-wall-draw"; point: Point2D }
  | { type: "finish-wall-draw"; point: Point2D }
  | { type: "place-wall-point"; point: Point2D }
  | { type: "place-door"; wallId: string; along: number; doorType: ExhibitionDoorType }
  | { type: "cancel-wall" }
  | { type: "select-wall"; wallId: string | null }
  | { type: "update-wall"; wallId: string; patch: Partial<ExhibitionSceneWall> }
  | { type: "update-style"; patch: Partial<ExhibitionSceneStyle> }
  | { type: "update-image-placements"; imagePlacements: ExhibitionSceneImagePlacement[] }
  | { type: "begin-wall-drag"; wallId: string }
  | { type: "preview-wall-endpoint"; wallId: string; endpoint: WallEndpoint; point: Point2D }
  | { type: "end-wall-drag" }
  | { type: "delete-selected" }
  | { type: "undo" }
  | { type: "redo" };

const DEFAULT_FLOOR = { width: EDITOR_WORKSPACE_SIZE, depth: EDITOR_WORKSPACE_SIZE };
const DEFAULT_WALL_HEIGHT = 4;
const DEFAULT_WALL_THICKNESS = 0.15;
const MIN_WALL_LENGTH = 0.5;
const HISTORY_LIMIT = 50;

function createId(prefix: string): string {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) return `${prefix}-${crypto.randomUUID()}`;
  return `${prefix}-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
}

export function createDefaultScene(): ExhibitionSceneDocument {
  return {
    version: 1,
    activeLevelId: "ground-level",
    levels: [{ id: "ground-level", name: "Ground level", elevation: 0, floor: DEFAULT_FLOOR }],
    walls: [],
  };
}

/**
 * Adapts the legacy fixed four-wall exhibition room into the V2 scene model.
 * Existing custom wall segments remain authoritative when present.
 */
export function createSceneFromExhibition(exhibition: Pick<Exhibition, "roomWidth" | "roomDepth" | "wallSegments">): ExhibitionSceneDocument {
  const width = exhibition.roomWidth ?? EXHIBITION_BOX_WIDTH;
  const depth = exhibition.roomDepth ?? EXHIBITION_BOX_DEPTH;
  const legacyWalls = exhibition.wallSegments?.length ? exhibition.wallSegments : createExhibitionBoxWalls(width, depth);

  return {
    version: 1,
    activeLevelId: "ground-level",
    levels: [{ id: "ground-level", name: "Ground level", elevation: 0, floor: { width, depth } }],
    walls: legacyWalls.map((wall) => ({ ...wall, levelId: "ground-level" })),
  };
}

function withHistory(state: EditorState, scene: ExhibitionSceneDocument): EditorState {
  return {
    ...state,
    scene,
    past: [...state.past, state.scene].slice(-HISTORY_LIMIT),
    future: [],
    pendingWallStart: null,
    dragStartScene: null,
  };
}

function activeLevel(state: EditorState) {
  return state.scene.levels.find((level) => level.id === state.scene.activeLevelId) ?? state.scene.levels[0];
}

function distanceBetween(a: Point2D, b: Point2D): number {
  return Math.hypot(b[0] - a[0], b[1] - a[1]);
}

export function snapPoint(point: Point2D, gridSize = 0.5): Point2D {
  return [Math.round(point[0] / gridSize) * gridSize, Math.round(point[1] / gridSize) * gridSize];
}

export function clampPointToWorkspace(point: Point2D): Point2D {
  return [
    Math.min(EDITOR_WORKSPACE_HALF_SIZE, Math.max(-EDITOR_WORKSPACE_HALF_SIZE, point[0])),
    Math.min(EDITOR_WORKSPACE_HALF_SIZE, Math.max(-EDITOR_WORKSPACE_HALF_SIZE, point[1])),
  ];
}

function clampWallPatch(patch: Partial<ExhibitionSceneWall>): Partial<ExhibitionSceneWall> {
  return {
    ...patch,
    ...(patch.start ? { start: clampPointToWorkspace(patch.start) } : {}),
    ...(patch.end ? { end: clampPointToWorkspace(patch.end) } : {}),
  };
}

function clampSceneToWorkspace(scene: ExhibitionSceneDocument): ExhibitionSceneDocument {
  const usedWallIds = new Set<string>();
  return {
    ...scene,
    walls: scene.walls.map((wall, index) => {
      const baseId = wall.id.trim() || `wall-${index + 1}`;
      let id = baseId;
      let suffix = 2;
      while (usedWallIds.has(id)) id = `${baseId}-${suffix++}`;
      usedWallIds.add(id);
      return {
        ...wall,
        id,
        start: clampPointToWorkspace(wall.start),
        end: clampPointToWorkspace(wall.end),
      };
    }),
  };
}

export function createInitialEditorState(scene = createDefaultScene()): EditorState {
  const normalizedScene = clampSceneToWorkspace(scene);
  return {
    scene: normalizedScene,
    tool: "wall",
    selectedWallId: null,
    pendingWallStart: null,
    past: [],
    future: [],
    dragStartScene: null,
  };
}

export function editorReducer(state: EditorState, action: EditorAction): EditorState {
  switch (action.type) {
    case "load":
      return createInitialEditorState(action.scene);
    case "set-tool":
      return { ...state, tool: action.tool, pendingWallStart: null, dragStartScene: null };
    case "set-active-level":
      return { ...state, scene: { ...state.scene, activeLevelId: action.levelId }, selectedWallId: null, pendingWallStart: null, dragStartScene: null };
    case "add-level": {
      const nextLevel = {
        id: createId("level"),
        name: `Level ${state.scene.levels.length + 1}`,
        elevation: state.scene.levels.length * DEFAULT_WALL_HEIGHT,
        floor: DEFAULT_FLOOR,
      };
      return withHistory(state, {
        ...state.scene,
        activeLevelId: nextLevel.id,
        levels: [...state.scene.levels, nextLevel],
      });
    }
    case "begin-wall-draw":
      return { ...state, pendingWallStart: clampPointToWorkspace(action.point), selectedWallId: null };
    case "finish-wall-draw": {
      const start = state.pendingWallStart;
      const end = clampPointToWorkspace(action.point);
      if (!start || distanceBetween(start, end) < MIN_WALL_LENGTH) return { ...state, pendingWallStart: null };
      const level = activeLevel(state);
      const wall: ExhibitionSceneWall = {
        id: createId("wall"),
        levelId: level.id,
        start,
        end,
        height: DEFAULT_WALL_HEIGHT,
        thickness: DEFAULT_WALL_THICKNESS,
      };
      return { ...withHistory(state, { ...state.scene, walls: [...state.scene.walls, wall] }), selectedWallId: wall.id };
    }
    case "place-wall-point": {
      const point = clampPointToWorkspace(action.point);
      if (!state.pendingWallStart) return { ...state, pendingWallStart: point };
      if (distanceBetween(state.pendingWallStart, point) < MIN_WALL_LENGTH) return state;
      const level = activeLevel(state);
      const wall: ExhibitionSceneWall = {
        id: createId("wall"),
        levelId: level.id,
        start: state.pendingWallStart,
        end: point,
        height: DEFAULT_WALL_HEIGHT,
        thickness: DEFAULT_WALL_THICKNESS,
      };
      return { ...withHistory(state, { ...state.scene, walls: [...state.scene.walls, wall] }), selectedWallId: wall.id };
    }
    case "place-door": {
      const wall = state.scene.walls.find((candidate) => candidate.id === action.wallId);
      if (!wall) return state;
      const along = clampDoorAlong(wall, action.along, action.doorType);
      const doors = state.scene.doors ?? [];
      if (along === null || doorOverlapsExisting(wall, along, action.doorType, doors)) return state;
      const door = {
        id: createId("door"),
        levelId: wall.levelId,
        wallId: wall.id,
        type: action.doorType,
        along,
      };
      return withHistory(state, { ...state.scene, doors: [...doors, door] });
    }
    case "cancel-wall":
      return { ...state, pendingWallStart: null };
    case "select-wall":
      return { ...state, selectedWallId: action.wallId, pendingWallStart: null };
    case "update-wall": {
      const patch = clampWallPatch(action.patch);
      const walls = state.scene.walls.map((wall) => wall.id === action.wallId ? { ...wall, ...patch } : wall);
      const updatedWall = walls.find((wall) => wall.id === action.wallId);
      if (updatedWall && distanceBetween(updatedWall.start, updatedWall.end) < MIN_WALL_LENGTH) return state;
      return withHistory(state, { ...state.scene, walls });
    }
    case "update-style":
      return withHistory(state, { ...state.scene, style: { ...resolveSceneStyle(state.scene.style), ...action.patch } });
    case "update-image-placements":
      return withHistory(state, { ...state.scene, imagePlacements: action.imagePlacements });
    case "begin-wall-drag":
      return { ...state, selectedWallId: action.wallId, dragStartScene: state.scene };
    case "preview-wall-endpoint": {
      if (!state.dragStartScene) return state;
      const point = clampPointToWorkspace(action.point);
      const walls = state.scene.walls.map((wall) => {
        if (wall.id !== action.wallId) return wall;
        const otherPoint = action.endpoint === "start" ? wall.end : wall.start;
        if (distanceBetween(point, otherPoint) < MIN_WALL_LENGTH) return wall;
        return { ...wall, [action.endpoint]: point };
      });
      return { ...state, scene: { ...state.scene, walls } };
    }
    case "end-wall-drag": {
      if (!state.dragStartScene) return state;
      const changed = JSON.stringify(state.dragStartScene) !== JSON.stringify(state.scene);
      return {
        ...state,
        past: changed ? [...state.past, state.dragStartScene].slice(-HISTORY_LIMIT) : state.past,
        future: changed ? [] : state.future,
        dragStartScene: null,
      };
    }
    case "delete-selected": {
      if (!state.selectedWallId) return state;
      return {
        ...withHistory(state, {
          ...state.scene,
          walls: state.scene.walls.filter((wall) => wall.id !== state.selectedWallId),
          doors: state.scene.doors?.filter((door) => door.wallId !== state.selectedWallId),
        }),
        selectedWallId: null,
      };
    }
    case "undo": {
      const previous = state.past.at(-1);
      if (!previous) return state;
      return { ...state, scene: previous, past: state.past.slice(0, -1), future: [state.scene, ...state.future], selectedWallId: null, pendingWallStart: null, dragStartScene: null };
    }
    case "redo": {
      const next = state.future[0];
      if (!next) return state;
      return { ...state, scene: next, past: [...state.past, state.scene].slice(-HISTORY_LIMIT), future: state.future.slice(1), selectedWallId: null, pendingWallStart: null, dragStartScene: null };
    }
    default:
      return state;
  }
}
