"use client";

import { useEffect, useMemo, useState } from "react";
import { Canvas } from "@react-three/fiber";
import { OrbitControls } from "@react-three/drei";
import { Check, Lock, Plus, Trash2 } from "lucide-react";
import type { Artwork, ExhibitionPlacement, ExhibitionSceneLevel, ExhibitionSceneWall } from "@atelier/contracts";
import { apiFetch, ApiError } from "@/lib/client/api";
import { useApiResource } from "@/lib/client/hooks";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { Lighting } from "@/components/spatial/Lighting";
import { RoomEnvironment } from "@/components/spatial/RoomEnvironment";
import { ArtworkMesh } from "@/components/spatial/ArtworkMesh";

/**
 * Placements only understand the classic four-wall box (see
 * CreateExhibitionBuilderPlacementRequestSchema.wallId in
 * packages/contracts/src/v1.ts — a strict "front"|"back"|"left"|"right"
 * enum). Define Space's arbitrary custom walls aren't representable there
 * yet, so this step only lights up once all four legacy walls are present
 * on the active level (true for every pre-made room template).
 */
const LEGACY_WALLS = ["front", "back", "left", "right"] as const;
type LegacyWallId = (typeof LEGACY_WALLS)[number];
const WALL_LABELS: Record<LegacyWallId, string> = { front: "Front wall", back: "Back wall", left: "Left wall", right: "Right wall" };

type FrameStyle = "dark-wood" | "light-wood" | "black" | "white";
const FRAME_STYLES: Array<{ id: FrameStyle; label: string; color: string }> = [
  { id: "dark-wood", label: "Dark wood", color: "#3b2a1a" },
  { id: "light-wood", label: "Light oak", color: "#c9a873" },
  { id: "black", label: "Black", color: "#1a1a1a" },
  { id: "white", label: "White", color: "#f2f0ea" },
];
const WALL_INSET = 0.1;

type TransformField = "positionX" | "positionY" | "positionZ" | "rotationY" | "scale";
const TRANSFORM_FIELDS: Array<{ name: TransformField; label: string; min: number; max: number; step: number }> = [
  { name: "positionX", label: "X (m)", min: -25, max: 25, step: 0.05 },
  { name: "positionY", label: "Y (m)", min: 0, max: 3.2, step: 0.05 },
  { name: "positionZ", label: "Z (m)", min: -25, max: 25, step: 0.05 },
  { name: "rotationY", label: "Rotation Y (°)", min: -360, max: 360, step: 1 },
  { name: "scale", label: "Scale", min: 0.1, max: 5, step: 0.05 },
];

function frameColorFor(frameStyle?: string) {
  return FRAME_STYLES.find((style) => style.id === frameStyle)?.color ?? "#2a2622";
}

function defaultWallSlot(index: number, roomWidth: number, roomDepth: number) {
  const wall = LEGACY_WALLS[index % LEGACY_WALLS.length];
  const halfWidth = roomWidth / 2 - WALL_INSET;
  const halfDepth = roomDepth / 2 - WALL_INSET;
  const along = ((Math.floor(index / LEGACY_WALLS.length) % 5) - 2) * 1.65;
  if (wall === "back") return { positionX: along, positionY: 1.6, positionZ: halfDepth, rotationY: 180, wallId: wall };
  if (wall === "left") return { positionX: -halfWidth, positionY: 1.6, positionZ: along, rotationY: 90, wallId: wall };
  if (wall === "right") return { positionX: halfWidth, positionY: 1.6, positionZ: along, rotationY: -90, wallId: wall };
  return { positionX: along, positionY: 1.6, positionZ: -halfDepth, rotationY: 0, wallId: wall };
}

function wallTransformFor(wallId: LegacyWallId, along: number, roomWidth: number, roomDepth: number) {
  const halfWidth = roomWidth / 2 - WALL_INSET;
  const halfDepth = roomDepth / 2 - WALL_INSET;
  if (wallId === "back") return { positionX: along, positionZ: halfDepth, rotationY: 180 };
  if (wallId === "left") return { positionX: -halfWidth, positionZ: along, rotationY: 90 };
  if (wallId === "right") return { positionX: halfWidth, positionZ: along, rotationY: -90 };
  return { positionX: along, positionZ: -halfDepth, rotationY: 0 };
}

function readError(error: unknown) {
  return error instanceof ApiError ? error.message : "Could not save changes. Please retry.";
}

function verificationBadge(artwork: Artwork) {
  if (artwork.verificationStatus === "verified") return <Badge variant="success">Verified</Badge>;
  if (artwork.verificationStatus === "rejected") return <Badge variant="destructive">Rejected</Badge>;
  return <Badge variant="warning">Pending review</Badge>;
}

function GalleryPreview({
  roomTemplateId,
  roomWidth,
  roomDepth,
  walls,
  placedArtworks,
  selectedPlacementId,
  onSelect,
}: {
  roomTemplateId: string;
  roomWidth: number;
  roomDepth: number;
  walls: ExhibitionSceneWall[];
  placedArtworks: Array<{ placement: ExhibitionPlacement; artwork: Artwork }>;
  selectedPlacementId: string | null;
  onSelect: (placementId: string) => void;
}) {
  return (
    <Canvas dpr={[1, 1.5]} camera={{ position: [0, roomDepth, roomDepth * 1.3], fov: 50, near: 0.1, far: 200 }}>
      <color attach="background" args={["#dbe4ee"]} />
      <Lighting templateId={roomTemplateId} />
      <RoomEnvironment templateId={roomTemplateId} width={roomWidth} depth={roomDepth} wallSegments={walls} />
      {placedArtworks.map(({ placement, artwork }) => (
        <ArtworkMesh
          key={placement.id}
          position={[placement.positionX, placement.positionY, placement.positionZ]}
          rotationY={(placement.rotationY * Math.PI) / 180}
          widthMeters={(artwork.widthCm / 100) * placement.scale}
          heightMeters={(artwork.heightCm / 100) * placement.scale}
          imageUrl={artwork.imageUrl}
          frameColor={frameColorFor(placement.frameStyle)}
          selected={placement.id === selectedPlacementId}
          onSelect={() => onSelect(placement.id)}
        />
      ))}
      <OrbitControls enableDamping enablePan enableZoom target={[0, 1.5, 0]} minDistance={2} maxDistance={40} />
    </Canvas>
  );
}

export function AddContentStep({
  exhibitionId,
  roomTemplateId,
  level,
  walls,
}: {
  exhibitionId: string;
  roomTemplateId: string;
  level: ExhibitionSceneLevel;
  walls: ExhibitionSceneWall[];
}) {
  const hasLegacyWalls = LEGACY_WALLS.every((wallId) => walls.some((wall) => wall.id === wallId));
  const [search, setSearch] = useState("");
  const artworksPath = search.trim()
    ? `/api/exhibitions/artworks?q=${encodeURIComponent(search.trim())}`
    : "/api/exhibitions/artworks";
  // Two separate fetches on purpose: `artworksResource` is the search-filtered
  // browse list in the sidebar, while `allArtworksResource` (never filtered)
  // resolves title/image/dimensions for whatever is already placed — so
  // typing in the search box can't make already-placed frames vanish from
  // the 3D preview just because they don't match the current query.
  const artworksResource = useApiResource<{ items: Artwork[]; total: number }>(artworksPath);
  const allArtworksResource = useApiResource<{ items: Artwork[]; total: number }>("/api/exhibitions/artworks");
  const placementsResource = useApiResource<{ items: ExhibitionPlacement[]; total: number }>(
    hasLegacyWalls ? `/api/exhibitions/${exhibitionId}/placements` : null,
  );

  const [placements, setPlacements] = useState<ExhibitionPlacement[]>([]);
  useEffect(() => {
    if (placementsResource.data) setPlacements(placementsResource.data.items);
    // Only re-sync when a fresh load actually lands — local edits (add/remove/
    // transform) manage `placements` themselves and shouldn't be clobbered by
    // this effect re-running for unrelated reasons.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [placementsResource.data]);

  const [dirtyIds, setDirtyIds] = useState<Set<string>>(new Set());
  const [selectedPlacementId, setSelectedPlacementId] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [savedMessage, setSavedMessage] = useState<string | null>(null);

  const artworks = artworksResource.data?.items ?? [];
  const allArtworks = allArtworksResource.data?.items ?? [];
  const allArtworkById = useMemo(() => new Map(allArtworks.map((artwork) => [artwork.id, artwork])), [allArtworks]);
  const placedArtworkIds = useMemo(() => new Set(placements.map((placement) => placement.artworkId)), [placements]);
  const placedArtworks = useMemo(
    () => placements.flatMap((placement) => {
      const artwork = allArtworkById.get(placement.artworkId);
      return artwork ? [{ placement, artwork }] : [];
    }),
    [allArtworkById, placements],
  );
  const selectedPlacement = placements.find((placement) => placement.id === selectedPlacementId) ?? null;
  const selectedArtwork = selectedPlacement ? allArtworkById.get(selectedPlacement.artworkId) ?? null : null;

  if (!hasLegacyWalls) {
    return (
      <div className="p-4">
        <div className="rounded-lg border border-border bg-muted/40 p-6 text-body-sm text-muted-foreground">
          <p className="font-medium text-foreground">Add Content needs the four-wall room layout.</p>
          <p className="mt-2">
            This level&apos;s floor plan was customised in Define Space, so it no longer has the standard front/back/left/right
            walls that artwork placement currently relies on. Placing artwork on custom floor plans isn&apos;t supported yet —
            pick one of the pre-made room templates when creating the exhibition to use Add Content.
          </p>
        </div>
      </div>
    );
  }

  function markDirty(placementId: string) {
    setDirtyIds((current) => new Set(current).add(placementId));
    setSavedMessage(null);
  }

  function updateSelected(patch: Partial<ExhibitionPlacement>) {
    if (!selectedPlacement) return;
    setPlacements((current) => current.map((placement) => (placement.id === selectedPlacement.id ? { ...placement, ...patch } : placement)));
    markDirty(selectedPlacement.id);
  }

  async function addArtwork(artwork: Artwork) {
    const existing = placements.find((placement) => placement.artworkId === artwork.id);
    if (existing) {
      setSelectedPlacementId(existing.id);
      return;
    }
    setBusy(true);
    setError(null);
    const slot = defaultWallSlot(placements.length, level.floor.width, level.floor.depth);
    try {
      const placement = await apiFetch<ExhibitionPlacement>(`/api/exhibitions/${exhibitionId}/placements`, {
        method: "POST",
        body: JSON.stringify({
          artworkId: artwork.id,
          positionX: slot.positionX,
          positionY: slot.positionY,
          positionZ: slot.positionZ,
          rotationX: 0,
          rotationY: slot.rotationY,
          rotationZ: 0,
          scale: 1,
          wallId: slot.wallId,
          frameStyle: "dark-wood",
          order: placements.length,
        }),
      });
      setPlacements((current) => [...current, placement]);
      setSelectedPlacementId(placement.id);
      setSavedMessage("Artwork added to the exhibition.");
    } catch (cause) {
      setError(readError(cause));
    } finally {
      setBusy(false);
    }
  }

  async function removeSelected() {
    if (!selectedPlacement) return;
    setBusy(true);
    setError(null);
    try {
      await apiFetch(`/api/exhibitions/${exhibitionId}/placements/${selectedPlacement.id}`, { method: "DELETE" });
      const remaining = placements.filter((placement) => placement.id !== selectedPlacement.id);
      setPlacements(remaining);
      setDirtyIds((current) => {
        const next = new Set(current);
        next.delete(selectedPlacement.id);
        return next;
      });
      setSelectedPlacementId(remaining[0]?.id ?? null);
      setSavedMessage("Artwork removed.");
    } catch (cause) {
      setError(readError(cause));
    } finally {
      setBusy(false);
    }
  }

  async function saveLayout() {
    setBusy(true);
    setError(null);
    setSavedMessage(null);
    try {
      const dirty = [...dirtyIds];
      const saved = await Promise.all(dirty.map((placementId) => {
        const placement = placements.find((item) => item.id === placementId);
        if (!placement) return Promise.reject(new Error("A selected placement is no longer available."));
        return apiFetch<ExhibitionPlacement>(`/api/exhibitions/${exhibitionId}/placements/${placementId}`, {
          method: "PATCH",
          body: JSON.stringify({
            positionX: placement.positionX,
            positionY: placement.positionY,
            positionZ: placement.positionZ,
            rotationX: placement.rotationX,
            rotationY: placement.rotationY,
            rotationZ: placement.rotationZ,
            scale: placement.scale,
            wallId: placement.wallId,
            frameStyle: placement.frameStyle,
          }),
        });
      }));
      setPlacements((current) => current.map((placement) => saved.find((item) => item.id === placement.id) ?? placement));
      setDirtyIds(new Set());
      setSavedMessage("Layout saved.");
    } catch (cause) {
      setError(readError(cause));
    } finally {
      setBusy(false);
    }
  }

  function changeWall(wallId: LegacyWallId) {
    if (!selectedPlacement) return;
    const along = selectedPlacement.wallId === "left" || selectedPlacement.wallId === "right" ? selectedPlacement.positionZ : selectedPlacement.positionX;
    updateSelected({ ...wallTransformFor(wallId, along, level.floor.width, level.floor.depth), wallId });
  }

  return (
    <div className="grid gap-3 p-3 lg:grid-cols-[220px_minmax(0,1fr)_260px]">
      <aside className="flex max-h-[560px] flex-col overflow-hidden rounded-lg border border-border bg-surface">
        <div className="border-b border-border p-3">
          <h3 className="text-body-sm font-medium text-foreground">Your artworks</h3>
          <Input
            className="mt-2 h-8 text-caption"
            placeholder="Search by title…"
            value={search}
            onChange={(event) => setSearch(event.target.value)}
          />
        </div>
        <div className="flex-1 overflow-y-auto p-2">
          {artworksResource.loading ? (
            <div className="grid gap-2 p-2"><Skeleton className="h-14 rounded-md" /><Skeleton className="h-14 rounded-md" /></div>
          ) : artworksResource.error ? (
            <p className="p-2 text-caption text-destructive-foreground">Couldn&apos;t load your artworks.</p>
          ) : artworks.length ? artworks.map((artwork) => {
            const placement = placements.find((item) => item.artworkId === artwork.id);
            return (
              <div key={artwork.id} className={`mb-2 rounded-md border p-2.5 ${placement?.id === selectedPlacementId ? "border-primary bg-primary/5" : "border-border"}`}>
                <button
                  type="button"
                  className="focus-ring block w-full text-left"
                  onClick={() => placement && setSelectedPlacementId(placement.id)}
                >
                  <span className="block truncate text-caption font-medium text-foreground">{artwork.title}</span>
                  <span className="mt-1 flex items-center gap-1.5">{verificationBadge(artwork)}</span>
                </button>
                <div className="mt-1.5">
                  {placement ? (
                    <span className="text-caption text-muted-foreground">In gallery</span>
                  ) : artwork.verificationStatus !== "verified" ? (
                    <Button size="sm" variant="outline" className="h-7 w-full text-caption" disabled title="Needs verification before it can go in an exhibition.">
                      <Lock className="size-3" /> Needs verification
                    </Button>
                  ) : (
                    <Button size="sm" variant="outline" className="h-7 w-full text-caption" disabled={busy} onClick={() => void addArtwork(artwork)}>
                      <Plus className="size-3" /> Add
                    </Button>
                  )}
                </div>
              </div>
            );
          }) : <p className="p-2 text-caption text-muted-foreground">No artworks found.</p>}
        </div>
      </aside>

      <section className="relative min-h-[420px] overflow-hidden rounded-lg border border-border bg-muted">
        {placementsResource.loading ? (
          <div className="absolute inset-0 grid place-items-center text-caption text-muted-foreground">Loading gallery…</div>
        ) : (
          <GalleryPreview
            roomTemplateId={roomTemplateId}
            roomWidth={level.floor.width}
            roomDepth={level.floor.depth}
            walls={walls}
            placedArtworks={placedArtworks}
            selectedPlacementId={selectedPlacementId}
            onSelect={setSelectedPlacementId}
          />
        )}
        {!placedArtworks.length && !placementsResource.loading ? (
          <div className="pointer-events-none absolute inset-0 grid place-items-center p-6 text-center">
            <div className="max-w-xs rounded-lg border border-border bg-surface/95 p-5 shadow-sm">
              <p className="font-display text-h3 text-foreground">Gallery is empty</p>
              <p className="mt-2 text-caption text-muted-foreground">Add an artwork from the list to place it on a wall.</p>
            </div>
          </div>
        ) : null}
        <div className="pointer-events-none absolute bottom-3 left-3 rounded bg-surface/90 px-2.5 py-1.5 text-caption text-muted-foreground">
          Drag to orbit · scroll to zoom · click a frame to select it
        </div>
      </section>

      <aside className="max-h-[560px] overflow-y-auto rounded-lg border border-border bg-surface p-3">
        <div className="flex items-center justify-between border-b border-border pb-2">
          <div>
            <h3 className="text-body-sm font-medium text-foreground">Properties</h3>
            {selectedArtwork ? <p className="mt-0.5 truncate text-caption text-muted-foreground">{selectedArtwork.title}</p> : <p className="mt-0.5 text-caption text-muted-foreground">Select a placed artwork.</p>}
          </div>
          <Button size="sm" disabled={busy || dirtyIds.size === 0} onClick={() => void saveLayout()}>
            <Check className="size-3.5" /> {busy ? "Saving…" : "Save layout"}
          </Button>
        </div>

        {selectedPlacement ? (
          <div className="grid gap-3 pt-3">
            <label className="grid gap-1 text-caption font-medium text-foreground">
              Wall
              <select
                className="focus-ring h-9 w-full rounded-md border border-border bg-surface px-2 text-caption"
                value={LEGACY_WALLS.includes(selectedPlacement.wallId as LegacyWallId) ? selectedPlacement.wallId : "front"}
                disabled={busy}
                onChange={(event) => changeWall(event.target.value as LegacyWallId)}
              >
                {LEGACY_WALLS.map((wallId) => <option key={wallId} value={wallId}>{WALL_LABELS[wallId]}</option>)}
              </select>
            </label>

            <div className="grid grid-cols-2 gap-2">
              {TRANSFORM_FIELDS.map((field) => (
                <label key={field.name} className="grid gap-1 text-caption text-muted-foreground">
                  {field.label}
                  <Input
                    type="number"
                    min={field.min}
                    max={field.max}
                    step={field.step}
                    className="h-8 text-caption"
                    value={selectedPlacement[field.name]}
                    disabled={busy}
                    onChange={(event) => {
                      if (event.target.value.trim()) updateSelected({ [field.name]: Number(event.target.value) } as Partial<ExhibitionPlacement>);
                    }}
                  />
                </label>
              ))}
            </div>

            <label className="grid gap-1 text-caption font-medium text-foreground">
              Frame
              <select
                className="focus-ring h-9 w-full rounded-md border border-border bg-surface px-2 text-caption"
                value={FRAME_STYLES.some((style) => style.id === selectedPlacement.frameStyle) ? selectedPlacement.frameStyle : "dark-wood"}
                disabled={busy}
                onChange={(event) => updateSelected({ frameStyle: event.target.value })}
              >
                {FRAME_STYLES.map((style) => <option key={style.id} value={style.id}>{style.label}</option>)}
              </select>
            </label>

            {selectedArtwork ? (
              <div className="rounded-md bg-muted/40 p-2.5 text-caption text-muted-foreground">
                <p>{selectedArtwork.widthCm} × {selectedArtwork.heightCm} cm</p>
                <p className="mt-1 capitalize">Availability: {selectedArtwork.availability}</p>
              </div>
            ) : null}

            <Button variant="outline" className="text-destructive-foreground" disabled={busy} onClick={() => void removeSelected()}>
              <Trash2 className="size-3.5" /> Remove from gallery
            </Button>
          </div>
        ) : (
          <p className="pt-3 text-caption text-muted-foreground">Add an artwork, or select one already placed, to edit its position, rotation, wall, and frame.</p>
        )}

        {error ? <p className="mt-3 text-caption text-destructive-foreground">{error}</p> : null}
        {savedMessage ? <p className="mt-3 text-caption text-primary">{savedMessage}</p> : null}
        <p className="mt-3 border-t border-border pt-3 text-caption text-muted-foreground">{placements.length} artwork{placements.length === 1 ? "" : "s"} placed</p>
      </aside>
    </div>
  );
}
