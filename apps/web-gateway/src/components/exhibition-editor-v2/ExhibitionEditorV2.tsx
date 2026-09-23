"use client";

import Link from "next/link";
import { useEffect, useMemo, useReducer, useState } from "react";
import type { ThreeEvent } from "@react-three/fiber";
import { ArrowLeft, ExternalLink, Eye, EyeOff, Plus, Redo2, Save, Trash2, Undo2 } from "lucide-react";
import type { Exhibition, ExhibitionDoorType, ExhibitionSceneDoor, ExhibitionSceneImagePlacement, ExhibitionSceneLevel, ExhibitionSceneStyle, ExhibitionSceneWall, ExhibitionSurfaceMaterial, SceneWall } from "@atelier/contracts";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { apiFetch, ApiError } from "@/lib/client/api";
import {
  createSceneFromExhibition,
  createInitialEditorState,
  clampPointToWorkspace,
  editorReducer,
  snapPoint,
  type EditorTool,
  type WallEndpoint,
} from "./editor-state";
import { deriveRoofLoops } from "./roof-geometry";
import type { DerivedRoofLoop } from "./roof-geometry";
import { ExhibitionEditorV2Viewport } from "./ExhibitionEditorV2Viewport";
import { AddContentStep } from "./AddContentStep";
import { resolveSceneStyle } from "./scene-style";
import { getExhibitionRoomName } from "@/components/exhibitions/exhibition-room-options";
import { wallLength } from "@/components/spatial/door-geometry";

interface ExhibitionEditorV2Props {
  id: string;
}

const WORKFLOW_STEPS = ["Define Space", "Shape Style", "Add Content", "Create Paths", "Publish & Share"];

function errorMessage(error: unknown): string {
  return error instanceof ApiError ? error.message : "The exhibition editor is unavailable.";
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

function ColorField({ label, value, onChange }: { label: string; value: string; onChange: (value: string) => void }) {
  return (
    <label className="grid gap-1 text-caption text-muted-foreground">
      <span>{label}</span>
      <div className="flex items-center gap-2">
        <input className="size-9 cursor-pointer rounded border border-input bg-background p-1" type="color" aria-label={label} value={value} onChange={(event) => onChange(event.target.value)} />
        <code className="text-body-sm text-foreground">{value.toUpperCase()}</code>
      </div>
    </label>
  );
}

function IntensityField({ label, value, max, onChange }: { label: string; value: number; max: number; onChange: (value: number) => void }) {
  return (
    <label className="grid gap-1 text-caption text-muted-foreground">
      <span className="flex justify-between gap-2"><span>{label}</span><output>{value.toFixed(1)}</output></span>
      <input type="range" min="0" max={max} step="0.1" value={value} aria-label={label} onChange={(event) => onChange(Number(event.target.value))} />
    </label>
  );
}

export function ExhibitionEditorV2({ id }: ExhibitionEditorV2Props) {
  const [state, dispatch] = useReducer(editorReducer, undefined, () => createInitialEditorState());
  const [savedScene, setSavedScene] = useState(state.scene);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [savedMessage, setSavedMessage] = useState<string | null>(null);
  const [exhibitionTitle, setExhibitionTitle] = useState("Exhibition");
  const [exhibition, setExhibition] = useState<Exhibition | null>(null);
  const [reloadToken, setReloadToken] = useState(0);
  const [showCeilings, setShowCeilings] = useState(true);
  const [activeStep, setActiveStep] = useState(0);
  const [doorType, setDoorType] = useState<ExhibitionDoorType>("single");

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setLoadError(null);
    void apiFetch<Exhibition>(`/api/exhibitions/${encodeURIComponent(id)}`)
      .then((loaded) => {
        if (cancelled) return;
        const scene = loaded.scene ?? createSceneFromExhibition(loaded);
        dispatch({ type: "load", scene });
        setSavedScene(scene);
        setExhibitionTitle(loaded.title);
        setExhibition(loaded);
      })
      .catch((loadError: unknown) => {
        if (!cancelled) setLoadError(errorMessage(loadError));
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [id, reloadToken]);

  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") dispatch({ type: "cancel-wall" });
      if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === "z") {
        event.preventDefault();
        dispatch({ type: event.shiftKey ? "redo" : "undo" });
      }
      const target = event.target;
      const editingText = target instanceof HTMLElement && (target.tagName === "INPUT" || target.tagName === "TEXTAREA" || target.isContentEditable);
      if (activeStep === 0 && event.key.toLowerCase() === "v" && !editingText) {
        event.preventDefault();
        dispatch({ type: "set-tool", tool: "select" });
      }
      if (activeStep === 0 && event.key.toLowerCase() === "c" && !editingText) {
        event.preventDefault();
        dispatch({ type: "set-tool", tool: "wall" });
      }
      if (activeStep === 0 && event.key === "Delete" && !editingText) {
        event.preventDefault();
        dispatch({ type: "delete-selected" });
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [activeStep]);

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
  const selectedWall = activeWalls.find((wall) => wall.id === state.selectedWallId) ?? null;
  const sceneStyle = useMemo(() => resolveSceneStyle(state.scene.style), [state.scene.style]);
  const dirty = JSON.stringify(state.scene) !== JSON.stringify(savedScene);

  function selectTool(tool: EditorTool) {
    dispatch({ type: "set-tool", tool });
    setSavedMessage(null);
  }

  function updateSelectedWall(patch: Partial<ExhibitionSceneWall>) {
    if (!selectedWall) return;
    dispatch({ type: "update-wall", wallId: selectedWall.id, patch });
    setSavedMessage(null);
  }

  function updateSceneStyle(patch: Partial<ExhibitionSceneStyle>) {
    dispatch({ type: "update-style", patch });
    setSavedMessage(null);
  }

  async function saveScene(sceneOverride = state.scene): Promise<boolean> {
    setBusy(true);
    setError(null);
    setSavedMessage(null);
    try {
      const updated = await apiFetch<Exhibition>(`/api/exhibitions/${encodeURIComponent(id)}`, {
        method: "PATCH",
        body: JSON.stringify({ scene: sceneOverride }),
      });
      const persistedScene = updated.scene ?? sceneOverride;
      setSavedScene(persistedScene);
      setExhibition(updated);
      setSavedMessage("Space saved");
      return true;
    } catch (saveError) {
      setError(errorMessage(saveError));
      return false;
    } finally {
      setBusy(false);
    }
  }

  function updateImagePlacements(imagePlacements: ExhibitionSceneImagePlacement[]) {
    dispatch({ type: "update-image-placements", imagePlacements });
    setSavedMessage(null);
  }

  async function selectWorkflowStep(step: number) {
    if (step === activeStep || busy) return;
    if (dirty && !(await saveScene())) return;
    setActiveStep(step);
  }

  function handleGroundPointerDown(point: [number, number]) {
    const workspacePoint = clampPointToWorkspace(snapPoint(point));
    if (state.tool === "wall") {
      dispatch({ type: "place-wall-point", point: workspacePoint });
    } else {
      dispatch({ type: "select-wall", wallId: null });
    }
    setSavedMessage(null);
  }

  function handlePlaceDoor(event: ThreeEvent<PointerEvent>, wall: SceneWall) {
    const length = wallLength(wall);
    if (!length) return;
    const directionX = (wall.end[0] - wall.start[0]) / length;
    const directionZ = (wall.end[1] - wall.start[1]) / length;
    const along = (event.point.x - wall.start[0]) * directionX + (event.point.z - wall.start[1]) * directionZ;
    dispatch({ type: "place-door", wallId: wall.id, along, doorType });
    setSavedMessage(null);
  }

  function handleBeginWallEndpointDrag(wallId: string) {
    dispatch({ type: "begin-wall-drag", wallId });
    setSavedMessage(null);
  }

  function handleMoveWallEndpoint(wallId: string, endpoint: WallEndpoint, point: [number, number]) {
    dispatch({ type: "preview-wall-endpoint", wallId, endpoint, point: clampPointToWorkspace(snapPoint(point)) });
  }

  function handleEndWallEndpointDrag() {
    dispatch({ type: "end-wall-drag" });
  }

  if (loading) {
    return <div className="rounded-xl border border-border bg-surface p-8 text-body-sm text-muted-foreground">Loading exhibition editor…</div>;
  }

  if (loadError) {
    return (
      <div className="rounded-xl border border-destructive/40 bg-surface p-8">
        <p className="text-body-sm text-destructive-foreground">{loadError}</p>
        <Button className="mt-4" variant="outline" onClick={() => setReloadToken((token) => token + 1)}>Retry</Button>
      </div>
    );
  }

  return (
    <section className="overflow-hidden rounded-xl border border-border bg-surface shadow-sm">
      <header className="border-b border-border bg-background px-4 py-3 sm:px-6">
        <div className="flex flex-wrap items-center gap-3">
          <Button asChild size="icon" variant="ghost" aria-label="Back to exhibitions">
            <Link href="/exhibitions/manage"><ArrowLeft className="size-4" /></Link>
          </Button>
          <div className="min-w-0 flex-1">
            <p className="truncate text-body-sm font-medium text-foreground">{exhibitionTitle}</p>
            <p className="text-caption text-muted-foreground">Exhibition Editor</p>
          </div>
          <Button variant="outline" size="sm" disabled={!state.past.length} onClick={() => dispatch({ type: "undo" })} aria-label="Undo">
            <Undo2 className="size-4" />
          </Button>
          <Button variant="outline" size="sm" disabled={!state.future.length} onClick={() => dispatch({ type: "redo" })} aria-label="Redo">
            <Redo2 className="size-4" />
          </Button>
          <Button size="sm" disabled={busy || !dirty} onClick={() => void saveScene()}>
            <Save className="size-4" />
            {busy ? "Saving…" : "Save"}
          </Button>
        </div>
        <nav aria-label="Exhibition workflow" className="mt-4 flex gap-2 overflow-x-auto pb-1">
          {WORKFLOW_STEPS.map((step, index) => (
            <button
              key={step}
              type="button"
              onClick={() => void selectWorkflowStep(index)}
              disabled={busy}
              aria-current={index === activeStep ? "step" : undefined}
              className={`whitespace-nowrap rounded-full border px-3 py-1.5 text-caption transition-colors ${index === activeStep ? "border-primary bg-primary/10 font-medium text-primary" : "border-border text-muted-foreground hover:text-foreground"}`}
            >
              {index + 1}. {step}
            </button>
          ))}
        </nav>
      </header>

      {activeStep === 0 ? (
        <div className="grid lg:grid-cols-[minmax(0,1fr)_340px]">
          <div className="relative min-h-[620px] bg-muted">
            {activeLevel ? (
              <ExhibitionEditorV2Viewport
                level={activeLevel}
                walls={activeWalls}
                doors={activeDoors}
                roofLoops={roofLoops}
                showCeilings={showCeilings}
                style={sceneStyle}
                tool={state.tool}
                selectedWallId={state.selectedWallId}
                onSelectWall={(wallId) => dispatch({ type: "select-wall", wallId })}
                onGroundPointerDown={handleGroundPointerDown}
                onPlaceDoor={handlePlaceDoor}
                onBeginWallEndpointDrag={handleBeginWallEndpointDrag}
                onMoveWallEndpoint={handleMoveWallEndpoint}
                onEndWallEndpointDrag={handleEndWallEndpointDrag}
              />
            ) : null}
            <div className="pointer-events-none absolute left-4 top-4 rounded-md border border-border bg-surface/90 px-3 py-2 text-caption text-muted-foreground">
              <p>{state.tool === "wall" ? "Click two points on the grid to create a wall" : state.tool === "door" ? "Select a door type, then click a wall to place it" : "Select a wall to edit it"}{state.pendingWallStart ? " · Choose the end point" : ""}</p>
              <p className="mt-1">Left click select · Alt+left-drag orbit · middle-drag pan · right mouse + W/A/S/D fly · Q down / E up · Shift for 2× speed</p>
            </div>
          </div>

          <aside className="border-t border-border bg-background p-4 lg:border-l lg:border-t-0">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="font-medium text-foreground">Define Space</h2>
                <p className="mt-1 text-caption text-muted-foreground">Use the full 50 × 50 m workspace to draw walls. Select a wall and drag its orange endpoints to reshape it.</p>
              </div>
              <Badge variant="outline" className="capitalize">{exhibition?.status ?? "draft"}</Badge>
            </div>

            <div className="mt-5 rounded-lg border border-border bg-muted/40 p-3">
              <div className="flex items-center justify-between gap-2">
                <div>
                  <p className="text-body-sm font-medium text-foreground">Levels</p>
                  <p className="text-caption text-muted-foreground">Choose the active floor.</p>
                </div>
                <Button size="sm" variant="outline" onClick={() => dispatch({ type: "add-level" })}>
                  <Plus className="size-4" /> Add level
                </Button>
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

            <div className="mt-4 grid grid-cols-3 gap-2">
              <Button variant={state.tool === "select" ? "primary" : "outline"} onClick={() => selectTool("select")}>Select</Button>
              <Button variant={state.tool === "wall" ? "primary" : "outline"} onClick={() => selectTool("wall")}>Wall</Button>
              <Button variant={state.tool === "door" ? "primary" : "outline"} onClick={() => selectTool("door")}>Door</Button>
            </div>

            {state.tool === "door" ? (
              <div className="mt-4 rounded-lg border border-border bg-muted/40 p-3">
                <p className="text-body-sm font-medium text-foreground">Door type</p>
                <p className="mt-1 text-caption text-muted-foreground">Doors snap to the wall under the cursor.</p>
                <div className="mt-3 grid grid-cols-2 gap-2">
                  {(["single", "double"] as const).map((type) => (
                    <button
                      key={type}
                      type="button"
                      aria-pressed={doorType === type}
                      onClick={() => setDoorType(type)}
                      className={`rounded-md border p-3 text-left transition-colors ${doorType === type ? "border-primary bg-primary/10 text-primary" : "border-border bg-background text-muted-foreground hover:text-foreground"}`}
                    >
                      <span className="block text-body-sm font-medium capitalize">{type}</span>
                      <span className="mt-1 block text-caption">{type === "single" ? "One leaf" : "Two leaves"}</span>
                    </button>
                  ))}
                </div>
              </div>
            ) : null}

            <div className="mt-4 rounded-lg border border-border bg-muted/40 p-3 text-caption text-muted-foreground">
              Fixed workspace: <span className="font-medium text-foreground">50 × 50 m</span> · 5 m grid sections · 0.5 m snap
            </div>

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

            {state.pendingWallStart ? (
              <div className="mt-3 flex items-center justify-between rounded-md border border-primary/30 bg-primary/5 px-3 py-2 text-caption text-primary">
                <span>Wall start: {state.pendingWallStart.join(", ")}</span>
                <Button size="sm" variant="ghost" onClick={() => dispatch({ type: "cancel-wall" })}>Cancel</Button>
              </div>
            ) : null}

            {selectedWall ? (
              <div className="mt-5 border-t border-border pt-4">
                <div className="flex items-center justify-between">
                  <div>
                    <h3 className="font-medium text-foreground">Selected wall</h3>
                    <p className="text-caption text-muted-foreground">Edit its geometry in metres.</p>
                  </div>
                  <Button size="icon" variant="ghost" aria-label="Delete selected wall" onClick={() => dispatch({ type: "delete-selected" })}>
                    <Trash2 className="size-4" />
                  </Button>
                </div>
                <div className="mt-3 grid grid-cols-2 gap-2">
                  <NumberField label="Start X" value={selectedWall.start[0]} onChange={(value) => updateSelectedWall({ start: [value, selectedWall.start[1]] })} />
                  <NumberField label="Start Z" value={selectedWall.start[1]} onChange={(value) => updateSelectedWall({ start: [selectedWall.start[0], value] })} />
                  <NumberField label="End X" value={selectedWall.end[0]} onChange={(value) => updateSelectedWall({ end: [value, selectedWall.end[1]] })} />
                  <NumberField label="End Z" value={selectedWall.end[1]} onChange={(value) => updateSelectedWall({ end: [selectedWall.end[0], value] })} />
                  <NumberField label="Height" value={selectedWall.height} onChange={(value) => updateSelectedWall({ height: Math.max(0.1, value) })} />
                  <NumberField label="Thickness" value={selectedWall.thickness} onChange={(value) => updateSelectedWall({ thickness: Math.max(0.01, value) })} />
                </div>
              </div>
            ) : (
              <div className="mt-5 border-t border-border pt-4 text-caption text-muted-foreground">
                Select a wall to edit its endpoints, height, or thickness.
              </div>
            )}

            {error ? <p className="mt-4 text-caption text-destructive-foreground">{error}</p> : null}
            {savedMessage ? <p className="mt-4 text-caption text-primary">{savedMessage}</p> : null}
            <p className="mt-5 text-caption text-muted-foreground">{activeWalls.length} wall{activeWalls.length === 1 ? "" : "s"} · {activeDoors.length} door{activeDoors.length === 1 ? "" : "s"} on this level · 50 × 50 m workspace · 0.5 m snap</p>
          </aside>
        </div>
      ) : activeStep === 1 ? (
        activeLevel ? (
          <ShapeStyleStep level={activeLevel} walls={activeWalls} doors={activeDoors} roofLoops={roofLoops} style={sceneStyle} onChange={updateSceneStyle} />
        ) : null
      ) : activeStep === 2 ? (
        activeLevel ? (
          <AddContentStep
            exhibitionId={id}
            roomTemplateId={exhibition?.roomTemplateId ?? "white-cube"}
            level={activeLevel}
            walls={activeWalls}
            style={state.scene.style}
            imagePlacements={state.scene.imagePlacements}
            scene={state.scene}
            onImagePlacementsChange={updateImagePlacements}
            onSaveScene={saveScene}
          />
        ) : null
      ) : activeStep === 4 ? (
        <PublishStep exhibition={exhibition} onPublished={setExhibition} />
      ) : (
        <div className="p-8 text-body-sm text-muted-foreground">
          {WORKFLOW_STEPS[activeStep]} isn&apos;t available yet — check back after Define Space, Shape Style, and Add Content.
        </div>
      )}
    </section>
  );
}

function ShapeStyleStep({
  level,
  walls,
  doors,
  roofLoops,
  style,
  onChange,
}: {
  level: ExhibitionSceneLevel;
  walls: ExhibitionSceneWall[];
  doors: ExhibitionSceneDoor[];
  roofLoops: DerivedRoofLoop[];
  style: ExhibitionSceneStyle;
  onChange: (patch: Partial<ExhibitionSceneStyle>) => void;
}) {
  const materialOptions: Array<{ value: ExhibitionSurfaceMaterial; label: string }> = [
    { value: "matte", label: "Matte" },
    { value: "satin", label: "Satin" },
    { value: "polished", label: "Polished" },
  ];

  return (
    <div className="grid lg:grid-cols-[minmax(0,1fr)_340px]">
      <div className="relative min-h-[620px] bg-muted">
        <ExhibitionEditorV2Viewport
          level={level}
          walls={walls}
          doors={doors}
          roofLoops={roofLoops}
          showCeilings
          style={style}
          readOnly
          selectedWallId={null}
          onSelectWall={() => undefined}
          onGroundPointerDown={() => undefined}
          onBeginWallEndpointDrag={() => undefined}
          onMoveWallEndpoint={() => undefined}
          onEndWallEndpointDrag={() => undefined}
        />
        <div className="pointer-events-none absolute left-4 top-4 rounded-md border border-border bg-surface/90 px-3 py-2 text-caption text-muted-foreground">Orbit, pan, and zoom to preview your room style.</div>
      </div>

      <aside className="border-t border-border bg-background p-4 lg:border-l lg:border-t-0">
        <h2 className="font-medium text-foreground">Shape Style</h2>
        <p className="mt-1 text-caption text-muted-foreground">Set the room finishes, lighting, and environment. Save from the workflow header when you are done.</p>

        <div className="mt-5 grid grid-cols-2 gap-3 rounded-lg border border-border bg-muted/40 p-3">
          <ColorField label="Wall color" value={style.wallColor} onChange={(wallColor) => onChange({ wallColor })} />
          <ColorField label="Floor color" value={style.floorColor} onChange={(floorColor) => onChange({ floorColor })} />
          <ColorField label="Ceiling color" value={style.ceilingColor} onChange={(ceilingColor) => onChange({ ceilingColor })} />
          <ColorField label="Environment" value={style.environmentColor} onChange={(environmentColor) => onChange({ environmentColor })} />
        </div>

        <div className="mt-4 grid gap-3 rounded-lg border border-border bg-muted/40 p-3">
          <label className="grid gap-1 text-caption text-muted-foreground">
            <span>Wall finish</span>
            <select className="h-9 rounded-md border border-input bg-background px-3 text-body-sm text-foreground" value={style.wallMaterial} aria-label="Wall finish" onChange={(event) => onChange({ wallMaterial: event.target.value as ExhibitionSurfaceMaterial })}>
              {materialOptions.map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}
            </select>
          </label>
          <label className="grid gap-1 text-caption text-muted-foreground">
            <span>Floor finish</span>
            <select className="h-9 rounded-md border border-input bg-background px-3 text-body-sm text-foreground" value={style.floorMaterial} aria-label="Floor finish" onChange={(event) => onChange({ floorMaterial: event.target.value as ExhibitionSurfaceMaterial })}>
              {materialOptions.map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}
            </select>
          </label>
        </div>

        <div className="mt-4 grid gap-3 rounded-lg border border-border bg-muted/40 p-3">
          <ColorField label="Light color" value={style.lightColor} onChange={(lightColor) => onChange({ lightColor })} />
          <IntensityField label="Ambient light" value={style.ambientLightIntensity} max={4} onChange={(ambientLightIntensity) => onChange({ ambientLightIntensity })} />
          <IntensityField label="Key light" value={style.directionalLightIntensity} max={8} onChange={(directionalLightIntensity) => onChange({ directionalLightIntensity })} />
        </div>
      </aside>
    </div>
  );
}

function PublishStep({ exhibition, onPublished }: { exhibition: Exhibition | null; onPublished: (exhibition: Exhibition) => void }) {
  const [slug, setSlug] = useState(exhibition?.slug ?? "");
  const [description, setDescription] = useState(exhibition?.description ?? "");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);

  useEffect(() => {
    if (!exhibition) return;
    setSlug(exhibition.slug);
    setDescription(exhibition.description ?? "");
  }, [exhibition]);

  if (!exhibition) return null;
  const roomName = getExhibitionRoomName(exhibition.roomTemplateId);

  async function save(patch: Record<string, unknown>, successMessage: string) {
    setBusy(true);
    setError(null);
    setMessage(null);
    try {
      const updated = await apiFetch<Exhibition>(`/api/exhibitions/${encodeURIComponent(exhibition!.id)}`, {
        method: "PATCH",
        body: JSON.stringify(patch),
      });
      onPublished(updated);
      setMessage(successMessage);
    } catch (cause) {
      setError(cause instanceof ApiError ? cause.message : "Could not save changes. Please retry.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="grid gap-5 p-4 sm:p-6 lg:max-w-xl">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="font-medium text-foreground">Publish & Share</h2>
          <p className="mt-1 text-caption text-muted-foreground">{roomName} room · {exhibition.artworkCount ?? 0} artwork{(exhibition.artworkCount ?? 0) === 1 ? "" : "s"}</p>
        </div>
        <Badge variant="outline" className="capitalize">{exhibition.status}</Badge>
      </div>

      <label className="grid gap-1.5 text-caption font-medium text-foreground">
        Public link
        <div className="flex items-center gap-1 text-body-sm text-muted-foreground">
          /exhibitions/
          <Input
            className="h-9"
            value={slug}
            disabled={busy}
            onChange={(event) => setSlug(event.target.value.toLowerCase().replace(/[^a-z0-9-]/g, "").replace(/-{2,}/g, "-").replace(/^-+|-+$/g, ""))}
          />
        </div>
      </label>

      <label className="grid gap-1.5 text-caption font-medium text-foreground">
        Description
        <textarea
          className="focus-ring min-h-24 w-full rounded-md border border-border bg-surface px-3 py-2 text-body-sm text-foreground"
          maxLength={2000}
          value={description}
          disabled={busy}
          onChange={(event) => setDescription(event.target.value)}
        />
      </label>

      <div className="flex flex-wrap items-center gap-2">
        <Button
          variant="outline"
          disabled={busy || (slug === exhibition.slug && description === (exhibition.description ?? ""))}
          onClick={() => void save({ slug, description }, "Details saved.")}
        >
          Save details
        </Button>
        {exhibition.status === "draft" ? (
          <Button disabled={busy} onClick={() => void save({ status: "published" }, "Exhibition published.")}>Publish</Button>
        ) : exhibition.status === "published" ? (
          <>
            <Button variant="outline" disabled={busy} onClick={() => void save({ status: "archived" }, "Exhibition archived.")}>Unpublish</Button>
            <Button asChild variant="outline" size="icon" aria-label="Open public exhibition">
              <Link href={`/exhibitions/${exhibition.slug}`} target="_blank"><ExternalLink className="size-4" /></Link>
            </Button>
          </>
        ) : (
          <Button disabled={busy} onClick={() => void save({ status: "published" }, "Exhibition published.")}>Republish</Button>
        )}
      </div>

      {error ? <p className="text-caption text-destructive-foreground">{error}</p> : null}
      {message ? <p className="text-caption text-primary">{message}</p> : null}
    </div>
  );
}
