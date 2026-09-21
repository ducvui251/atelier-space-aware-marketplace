"use client";

import Link from "next/link";
import { useEffect, useMemo, useReducer, useState } from "react";
import { ArrowLeft, ExternalLink, Eye, EyeOff, Plus, Redo2, Save, Trash2, Undo2 } from "lucide-react";
import type { Exhibition, ExhibitionSceneWall } from "@atelier/contracts";
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
import { ExhibitionEditorV2Viewport } from "./ExhibitionEditorV2Viewport";
import { AddContentStep } from "./AddContentStep";
import { getExhibitionRoomName } from "@/components/exhibitions/exhibition-room-options";

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
      if ((event.key === "Delete" || event.key === "Backspace") && event.target instanceof HTMLElement && event.target.tagName !== "INPUT") {
        dispatch({ type: "delete-selected" });
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, []);

  const activeLevel = state.scene.levels.find((level) => level.id === state.scene.activeLevelId) ?? state.scene.levels[0];
  const activeWalls = useMemo(
    () => state.scene.walls.filter((wall) => wall.levelId === activeLevel?.id),
    [activeLevel?.id, state.scene.walls],
  );
  const roofLoops = useMemo(
    () => activeLevel ? deriveRoofLoops(state.scene).filter((loop) => loop.levelId === activeLevel.id) : [],
    [activeLevel, state.scene],
  );
  const selectedWall = activeWalls.find((wall) => wall.id === state.selectedWallId) ?? null;
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

  async function saveScene() {
    setBusy(true);
    setError(null);
    setSavedMessage(null);
    try {
      const updated = await apiFetch<Exhibition>(`/api/exhibitions/${encodeURIComponent(id)}`, {
        method: "PATCH",
        body: JSON.stringify({ scene: state.scene }),
      });
      const persistedScene = updated.scene ?? state.scene;
      setSavedScene(persistedScene);
      setSavedMessage("Space saved");
    } catch (saveError) {
      setError(errorMessage(saveError));
    } finally {
      setBusy(false);
    }
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
              onClick={() => setActiveStep(index)}
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
                roofLoops={roofLoops}
                showCeilings={showCeilings}
                selectedWallId={state.selectedWallId}
                onSelectWall={(wallId) => dispatch({ type: "select-wall", wallId })}
                onGroundPointerDown={handleGroundPointerDown}
                onBeginWallEndpointDrag={handleBeginWallEndpointDrag}
                onMoveWallEndpoint={handleMoveWallEndpoint}
                onEndWallEndpointDrag={handleEndWallEndpointDrag}
              />
            ) : null}
            <div className="pointer-events-none absolute left-4 top-4 rounded-md border border-border bg-surface/90 px-3 py-2 text-caption text-muted-foreground">
              {state.tool === "wall" ? "Click two points on the grid to create a wall" : "Select a wall to edit it"}
              {state.pendingWallStart ? " · Choose the end point" : ""}
            </div>
          </div>

          <aside className="border-t border-border bg-background p-4 lg:border-l lg:border-t-0">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="font-medium text-foreground">Define Space</h2>
                <p className="mt-1 text-caption text-muted-foreground">Use the full 50 × 50 m workspace to draw walls. Select a wall and drag its orange endpoints to reshape it.</p>
              </div>
              <Badge variant="outline">Draft</Badge>
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

            <div className="mt-4 grid grid-cols-2 gap-2">
              <Button variant={state.tool === "select" ? "primary" : "outline"} onClick={() => selectTool("select")}>Select</Button>
              <Button variant={state.tool === "wall" ? "primary" : "outline"} onClick={() => selectTool("wall")}>Wall</Button>
            </div>

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
            <p className="mt-5 text-caption text-muted-foreground">{activeWalls.length} wall{activeWalls.length === 1 ? "" : "s"} on this level · 50 × 50 m workspace · 0.5 m snap</p>
          </aside>
        </div>
      ) : activeStep === 2 ? (
        activeLevel ? (
          <AddContentStep
            exhibitionId={id}
            roomTemplateId={exhibition?.roomTemplateId ?? "white-cube"}
            level={activeLevel}
            walls={activeWalls}
          />
        ) : null
      ) : activeStep === 4 ? (
        <PublishStep exhibition={exhibition} onPublished={setExhibition} />
      ) : (
        <div className="p-8 text-body-sm text-muted-foreground">
          {WORKFLOW_STEPS[activeStep]} isn&apos;t available yet — check back after Define Space and Add Content.
        </div>
      )}
    </section>
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
