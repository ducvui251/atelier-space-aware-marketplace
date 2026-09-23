"use client";

import { useEffect, useMemo, useReducer, useState } from "react";
import type { ThreeEvent } from "@react-three/fiber";
import { Eye, EyeOff, Plus, Trash2 } from "lucide-react";
import type { ExhibitionDoorType, ExhibitionRoomTemplateId, ExhibitionSceneWall, SceneWall } from "@atelier/contracts";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ExhibitionEditorV2Viewport } from "@/components/exhibition-editor-v2/ExhibitionEditorV2Viewport";
import {
  createDefaultScene,
  createInitialEditorState,
  createSceneFromExhibition,
  editorReducer,
  snapPoint,
  type EditorTool,
  type WallEndpoint,
} from "@/components/exhibition-editor-v2/editor-state";
import { deriveRoofLoops } from "@/components/exhibition-editor-v2/roof-geometry";
import { CreateExhibitionForm } from "./CreateExhibitionForm";
import { EXHIBITION_ROOM_OPTIONS } from "./exhibition-room-options";
import { wallLength } from "@/components/spatial/door-geometry";

const DEFAULT_TEMPLATE: ExhibitionRoomTemplateId = "white-cube";

function defaultPremadeScene() {
  return createSceneFromExhibition({ roomWidth: 10, roomDepth: 10, wallSegments: [] });
}

function NumberField({ label, value, onChange }: { label: string; value: number; onChange: (value: number) => void }) {
  return (
    <label className="grid gap-1 text-caption text-muted-foreground">
      <span>{label}</span>
      <Input
        type="number"
        step="0.1"
        value={value}
        aria-label={label}
        onChange={(event) => {
          const next = Number(event.target.value);
          if (Number.isFinite(next)) onChange(next);
        }}
      />
    </label>
  );
}

export function ExhibitionCreationStudio({ mode }: { mode: "premade" | "custom" }) {
  const [state, dispatch] = useReducer(editorReducer, undefined, () => createInitialEditorState(createDefaultScene()));
  const [roomTemplateId, setRoomTemplateId] = useState<ExhibitionRoomTemplateId>(DEFAULT_TEMPLATE);
  const activeLevel = state.scene.levels.find((level) => level.id === state.scene.activeLevelId) ?? state.scene.levels[0];
  const activeWalls = useMemo(
    () => state.scene.walls.filter((wall) => wall.levelId === activeLevel?.id),
    [activeLevel?.id, state.scene.walls],
  );
  const activeDoors = useMemo(
    () => (state.scene.doors ?? []).filter((door) => door.levelId === activeLevel?.id),
    [activeLevel?.id, state.scene.doors],
  );
  const roofLoops = useMemo(
    () => activeLevel ? deriveRoofLoops(state.scene).filter((loop) => loop.levelId === activeLevel.id) : [],
    [activeLevel, state.scene],
  );
  const [showCeilings, setShowCeilings] = useState(true);
  const selectedWall = activeWalls.find((wall) => wall.id === state.selectedWallId) ?? null;
  const [doorType, setDoorType] = useState<ExhibitionDoorType>("single");

  useEffect(() => {
    dispatch({ type: "load", scene: mode === "custom" ? createDefaultScene() : defaultPremadeScene() });
    dispatch({ type: "set-tool", tool: mode === "custom" ? "wall" : "select" });
  }, [mode]);

  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      const target = event.target;
      const editingText = target instanceof HTMLElement && (target.tagName === "INPUT" || target.tagName === "TEXTAREA" || target.isContentEditable);
      if (event.key.toLowerCase() === "v" && !editingText) {
        event.preventDefault();
        dispatch({ type: "set-tool", tool: "select" });
      }
      if (event.key.toLowerCase() === "w" && !editingText) {
        event.preventDefault();
        dispatch({ type: "set-tool", tool: "wall" });
      }
      if (event.key !== "Delete" || editingText) return;
      event.preventDefault();
      dispatch({ type: "delete-selected" });
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, []);

  function choosePremade(templateId: ExhibitionRoomTemplateId) {
    setRoomTemplateId(templateId);
    dispatch({ type: "load", scene: defaultPremadeScene() });
    dispatch({ type: "set-tool", tool: "select" });
  }

  function selectTool(tool: EditorTool) {
    dispatch({ type: "set-tool", tool });
  }

  function updateSelectedWall(patch: Partial<ExhibitionSceneWall>) {
    if (selectedWall) dispatch({ type: "update-wall", wallId: selectedWall.id, patch });
  }

  function handleGroundPointerDown(point: [number, number]) {
    if (mode === "custom" && state.tool === "wall") {
      dispatch({ type: "place-wall-point", point: snapPoint(point) });
    } else {
      dispatch({ type: "select-wall", wallId: null });
    }
  }

  function handlePlaceDoor(event: ThreeEvent<PointerEvent>, wall: SceneWall) {
    const length = wallLength(wall);
    if (!length) return;
    const directionX = (wall.end[0] - wall.start[0]) / length;
    const directionZ = (wall.end[1] - wall.start[1]) / length;
    const along = (event.point.x - wall.start[0]) * directionX + (event.point.z - wall.start[1]) * directionZ;
    dispatch({ type: "place-door", wallId: wall.id, along, doorType });
  }

  function handleBeginWallEndpointDrag(wallId: string) {
    dispatch({ type: "begin-wall-drag", wallId });
  }

  function handleMoveWallEndpoint(wallId: string, endpoint: WallEndpoint, point: [number, number]) {
    dispatch({ type: "preview-wall-endpoint", wallId, endpoint, point: snapPoint(point) });
  }

  return (
    <section className="overflow-hidden rounded-xl border border-border bg-surface shadow-sm">
      <div className="grid lg:grid-cols-[minmax(0,1fr)_360px]">
        <div className="relative min-h-[620px] bg-muted">
          {activeLevel ? (
            <ExhibitionEditorV2Viewport
              level={activeLevel}
              walls={activeWalls}
              doors={activeDoors}
              roofLoops={roofLoops}
              showCeilings={showCeilings}
              tool={state.tool}
              selectedWallId={state.selectedWallId}
              onSelectWall={(wallId) => dispatch({ type: "select-wall", wallId })}
              onGroundPointerDown={handleGroundPointerDown}
              onPlaceDoor={handlePlaceDoor}
              onBeginWallEndpointDrag={handleBeginWallEndpointDrag}
              onMoveWallEndpoint={handleMoveWallEndpoint}
              onEndWallEndpointDrag={() => dispatch({ type: "end-wall-drag" })}
            />
          ) : null}
          <div className="pointer-events-none absolute left-4 top-4 rounded-md border border-border bg-surface/90 px-3 py-2 text-caption text-muted-foreground">
            {mode !== "custom" ? "Choose a pre-made room or switch to Create Custom" : state.tool === "door" ? "Select a door type, then click a wall to place it" : "Click two points on the grid to create a wall"}
            {state.pendingWallStart ? " · Choose the end point" : ""}
          </div>
        </div>

        <aside className="max-h-[760px] overflow-y-auto border-t border-border bg-background p-4 lg:border-l lg:border-t-0">
          <div>
            <h2 className="font-medium text-foreground">Define Space</h2>
            <p className="mt-1 text-caption text-muted-foreground">
              {mode === "premade" ? "Select a room to preview it on the Define Space grid." : "Draw the room walls directly on the grid."}
            </p>
          </div>

          {mode === "premade" ? (
            <div className="mt-4 grid gap-3">
              {EXHIBITION_ROOM_OPTIONS.map((option) => {
                const selected = roomTemplateId === option.id;
                return (
                  <button
                    key={option.id}
                    type="button"
                    aria-pressed={selected}
                    className={`grid gap-2 rounded-lg border p-3 text-left transition-colors ${selected ? "border-primary bg-primary/5" : "border-border hover:bg-muted/40"}`}
                    onClick={() => choosePremade(option.id)}
                  >
                    <span aria-hidden="true" className="flex h-16 overflow-hidden rounded-md border border-border">
                      {option.swatches.map((swatch, index) => <span key={`${option.id}-${index}`} className={`flex-1 ${swatch}`} />)}
                    </span>
                    <span className="text-body-sm font-medium text-foreground">{option.name}</span>
                    <span className="text-caption text-muted-foreground">{option.description}</span>
                  </button>
                );
              })}
            </div>
          ) : (
            <div className="mt-4 grid gap-3">
              <div className="rounded-md border border-primary/30 bg-primary/5 p-3 text-caption text-primary">
                Select Wall, then click two points on the grid. Walls snap to 0.5 m.
              </div>
              <div className="grid grid-cols-3 gap-2">
                <Button variant={state.tool === "select" ? "primary" : "outline"} onClick={() => selectTool("select")}>Select</Button>
                <Button variant={state.tool === "wall" ? "primary" : "outline"} onClick={() => selectTool("wall")}><Plus className="size-4" /> Wall</Button>
                <Button variant={state.tool === "door" ? "primary" : "outline"} onClick={() => selectTool("door")}>Door</Button>
              </div>
              {state.tool === "door" ? (
                <div className="rounded-md border border-border bg-muted/30 p-3">
                  <p className="text-body-sm font-medium text-foreground">Door type</p>
                  <p className="mt-1 text-caption text-muted-foreground">Click a wall to place a door.</p>
                  <div className="mt-3 grid grid-cols-2 gap-2">
                    {(["single", "double"] as const).map((type) => (
                      <button
                        key={type}
                        type="button"
                        aria-pressed={doorType === type}
                        onClick={() => setDoorType(type)}
                        className={`rounded-md border p-2 text-left text-caption capitalize ${doorType === type ? "border-primary bg-primary/10 text-primary" : "border-border bg-background text-muted-foreground"}`}
                      >
                        {type}
                      </button>
                    ))}
                  </div>
                </div>
              ) : null}
              <div className="rounded-md border border-border bg-muted/30 p-3">
                <div className="flex items-center justify-between gap-2">
                  <div>
                    <p className="text-body-sm font-medium text-foreground">Levels</p>
                    <p className="text-caption text-muted-foreground">Choose the active floor.</p>
                  </div>
                  <Button size="sm" variant="outline" onClick={() => dispatch({ type: "add-level" })}><Plus className="size-4" /> Add level</Button>
                </div>
                <select
                  className="mt-3 h-9 w-full rounded-md border border-input bg-background px-3 text-body-sm text-foreground"
                  value={state.scene.activeLevelId}
                  aria-label="Active level"
                  onChange={(event) => dispatch({ type: "set-active-level", levelId: event.target.value })}
                >
                  {state.scene.levels.map((level) => <option key={level.id} value={level.id}>{level.name}</option>)}
                </select>
              </div>
              {selectedWall ? (
                <div className="grid gap-3 rounded-md border border-border p-3">
                  <div className="flex items-center justify-between gap-2">
                    <div>
                      <p className="text-body-sm font-medium text-foreground">Selected wall</p>
                      <p className="text-caption text-muted-foreground">Edit geometry in metres.</p>
                    </div>
                    <Button size="icon" variant="ghost" aria-label="Delete selected wall" onClick={() => dispatch({ type: "delete-selected" })}><Trash2 className="size-4" /></Button>
                  </div>
                  <div className="grid grid-cols-2 gap-2">
                    <NumberField label="Start X" value={selectedWall.start[0]} onChange={(value) => updateSelectedWall({ start: [value, selectedWall.start[1]] })} />
                    <NumberField label="Start Z" value={selectedWall.start[1]} onChange={(value) => updateSelectedWall({ start: [selectedWall.start[0], value] })} />
                    <NumberField label="End X" value={selectedWall.end[0]} onChange={(value) => updateSelectedWall({ end: [value, selectedWall.end[1]] })} />
                    <NumberField label="End Z" value={selectedWall.end[1]} onChange={(value) => updateSelectedWall({ end: [selectedWall.end[0], value] })} />
                    <NumberField label="Height" value={selectedWall.height} onChange={(value) => updateSelectedWall({ height: Math.max(0.1, value) })} />
                    <NumberField label="Thickness" value={selectedWall.thickness} onChange={(value) => updateSelectedWall({ thickness: Math.max(0.01, value) })} />
                  </div>
                </div>
              ) : null}
            </div>
          )}

          <div className="mt-4 flex items-center justify-between gap-3 rounded-lg border border-border bg-muted/40 p-3">
            <div>
              <p className="text-body-sm font-medium text-foreground">Ceiling preview</p>
              <p className="text-caption text-muted-foreground">{roofLoops.length ? `${roofLoops.length} enclosed room${roofLoops.length === 1 ? "" : "s"}` : "Close a wall loop to add a ceiling"}</p>
            </div>
            <Button
              size="sm"
              variant="outline"
              aria-pressed={showCeilings}
              aria-label={showCeilings ? "Hide ceiling preview" : "Show ceiling preview"}
              onClick={() => setShowCeilings((visible) => !visible)}
            >
              {showCeilings ? <Eye className="size-4" /> : <EyeOff className="size-4" />}
              {showCeilings ? "Visible" : "Hidden"}
            </Button>
          </div>

          <div className="mt-5 border-t border-border pt-4">
            <h3 className="font-medium text-foreground">Exhibition details</h3>
            <p className="mt-1 text-caption text-muted-foreground">Save this space as a draft to continue arranging artwork.</p>
            <div className="mt-3">
              <CreateExhibitionForm startMode={mode} roomTemplateId={roomTemplateId} scene={state.scene} hideRoomStyle />
            </div>
          </div>
        </aside>
      </div>
    </section>
  );
}
