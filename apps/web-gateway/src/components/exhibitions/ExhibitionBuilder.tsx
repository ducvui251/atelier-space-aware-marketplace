"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { ArrowLeft, Check, ExternalLink, Lock, Plus, RefreshCw, Save, Trash2 } from "lucide-react";
import type { Artwork, Exhibition, ExhibitionPlacement, UpdateExhibitionBuilderPlacementRequest } from "@atelier/contracts";
import { apiFetch, ApiError } from "@/lib/client/api";
import { useAuth, useApiResource } from "@/lib/client/hooks";
import { ExhibitionBuilderViewportLoader } from "@/components/spatial/exhibition/ExhibitionBuilderViewportLoader";
import { getExhibitionRoomName } from "./exhibition-room-options";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";

type WallId = "front" | "back" | "left" | "right";
type FrameStyle = "dark-wood" | "light-wood" | "black" | "white";
type TransformField = "positionX" | "positionY" | "positionZ" | "rotationX" | "rotationY" | "rotationZ" | "scale";

const WALLS: Array<{ id: WallId; label: string }> = [
  { id: "front", label: "Front wall" },
  { id: "back", label: "Back wall" },
  { id: "left", label: "Left wall" },
  { id: "right", label: "Right wall" },
];

const FRAME_STYLES: Array<{ id: FrameStyle; label: string }> = [
  { id: "dark-wood", label: "Dark wood" },
  { id: "light-wood", label: "Light oak" },
  { id: "black", label: "Black" },
  { id: "white", label: "White" },
];
const EMPTY_ARTWORKS: Artwork[] = [];

const TRANSFORM_GROUPS: Array<{ title: string; fields: Array<{ name: TransformField; label: string; min: number; max: number; step: number }> }> = [
  { title: "Position (m)", fields: [
    { name: "positionX", label: "X", min: -5, max: 5, step: 0.05 },
    { name: "positionY", label: "Y", min: 0, max: 3.2, step: 0.05 },
    { name: "positionZ", label: "Z", min: -5, max: 5, step: 0.05 },
  ] },
  { title: "Rotation (°)", fields: [
    { name: "rotationX", label: "X", min: -360, max: 360, step: 1 },
    { name: "rotationY", label: "Y", min: -360, max: 360, step: 1 },
    { name: "rotationZ", label: "Z", min: -360, max: 360, step: 1 },
  ] },
];

function defaultWallSlot(index: number) {
  const wall = WALLS[Math.floor(index / 5) % WALLS.length].id;
  const along = ((index % 5) - 2) * 1.65;
  const placement = {
    positionX: along,
    positionY: 1.6,
    positionZ: -4.9,
    rotationX: 0,
    rotationY: 0,
    rotationZ: 0,
    scale: 1,
    wallId: wall,
  };
  if (wall === "back") return { ...placement, positionZ: 4.9, rotationY: 180 };
  if (wall === "left") return { ...placement, positionX: -4.9, positionZ: along, rotationY: 90 };
  if (wall === "right") return { ...placement, positionX: 4.9, positionZ: along, rotationY: -90 };
  return placement;
}

function placementPatch(placement: ExhibitionPlacement): UpdateExhibitionBuilderPlacementRequest {
  return {
    positionX: placement.positionX,
    positionY: placement.positionY,
    positionZ: placement.positionZ,
    rotationX: placement.rotationX,
    rotationY: placement.rotationY,
    rotationZ: placement.rotationZ,
    scale: placement.scale,
    ...(WALLS.some((wall) => wall.id === placement.wallId) ? { wallId: placement.wallId as WallId } : {}),
    ...(FRAME_STYLES.some((style) => style.id === placement.frameStyle) ? { frameStyle: placement.frameStyle as FrameStyle } : {}),
    ...(placement.order === undefined ? {} : { order: placement.order }),
  };
}

function verificationBadge(artwork: Artwork) {
  const variant = artwork.verificationStatus === "verified" ? "success" : artwork.verificationStatus === "rejected" ? "destructive" : "warning";
  const label = artwork.verificationStatus === "verified" ? "Verified" : artwork.verificationStatus === "rejected" ? "Rejected" : "Pending review";
  return <Badge variant={variant}>{label}</Badge>;
}

function readError(error: unknown) {
  return error instanceof ApiError ? error.message : "Could not save changes. Please retry.";
}

export function ExhibitionBuilder({ id }: { id: string }) {
  const { currentUser } = useAuth();
  const exhibitionResource = useApiResource<Exhibition>(`/api/exhibitions/${id}`);
  const placementsResource = useApiResource<{ items: ExhibitionPlacement[]; total: number }>(`/api/exhibitions/${id}/placements`);
  const artworksResource = useApiResource<{ items: Artwork[]; total: number }>("/api/exhibitions/artworks");
  const isAdmin = currentUser?.role === "admin";

  const [savedExhibition, setSavedExhibition] = useState<Exhibition | null>(null);
  const roomName = getExhibitionRoomName(savedExhibition?.roomTemplateId ?? "white-cube");
  const [placements, setPlacements] = useState<ExhibitionPlacement[]>([]);
  const [dirtyPlacementIds, setDirtyPlacementIds] = useState<Set<string>>(() => new Set());
  const [selectedPlacementId, setSelectedPlacementId] = useState<string | null>(null);
  const [title, setTitle] = useState("");
  const [slug, setSlug] = useState("");
  const [description, setDescription] = useState("");
  const [featured, setFeatured] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [savedMessage, setSavedMessage] = useState<string | null>(null);

  useEffect(() => {
    const exhibition = exhibitionResource.data;
    if (!exhibition) return;
    setSavedExhibition(exhibition);
    setTitle(exhibition.title);
    setSlug(exhibition.slug);
    setDescription(exhibition.description ?? "");
    setFeatured(exhibition.featured);
  }, [exhibitionResource.data]);

  useEffect(() => {
    if (!placementsResource.data) return;
    setPlacements(placementsResource.data.items);
    setSelectedPlacementId((current) => current && placementsResource.data!.items.some((item) => item.id === current)
      ? current
      : placementsResource.data!.items[0]?.id ?? null);
  }, [placementsResource.data]);

  const artworks = artworksResource.data?.items ?? EMPTY_ARTWORKS;
  const artworkById = useMemo(() => new Map(artworks.map((artwork) => [artwork.id, artwork])), [artworks]);
  const placedArtworks = useMemo(() => placements.flatMap((placement) => {
    const artwork = artworkById.get(placement.artworkId);
    return artwork ? [{ placement, artwork }] : [];
  }), [artworkById, placements]);
  const selectedPlacement = placements.find((placement) => placement.id === selectedPlacementId) ?? null;
  const selectedArtwork = selectedPlacement ? artworkById.get(selectedPlacement.artworkId) ?? null : null;
  const invalidDetails = !title.trim() || !/^[a-z0-9]+(-[a-z0-9]+)*$/.test(slug.trim());

  const loadError = exhibitionResource.error ?? placementsResource.error ?? artworksResource.error;
  const loading = exhibitionResource.loading || placementsResource.loading || artworksResource.loading;

  function markDirty(placementId: string) {
    setDirtyPlacementIds((current) => new Set(current).add(placementId));
    setSavedMessage(null);
  }

  function updateTransform(field: TransformField, value: number) {
    if (!selectedPlacement || !Number.isFinite(value)) return;
    setPlacements((current) => current.map((placement) => placement.id === selectedPlacement.id ? { ...placement, [field]: value } : placement));
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
    const slot = defaultWallSlot(placements.length);
    try {
      const placement = await apiFetch<ExhibitionPlacement>(`/api/exhibitions/${id}/placements`, {
        method: "POST",
        body: JSON.stringify({
          artworkId: artwork.id,
          ...slot,
          rotationX: 0,
          rotationZ: 0,
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

  async function removeSelectedPlacement() {
    if (!selectedPlacement) return;
    setBusy(true);
    setError(null);
    try {
      await apiFetch(`/api/exhibitions/${id}/placements/${selectedPlacement.id}`, { method: "DELETE" });
      const remaining = placements.filter((placement) => placement.id !== selectedPlacement.id);
      setPlacements(remaining);
      setDirtyPlacementIds((current) => {
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

  async function saveChanges(nextStatus?: Exhibition["status"]) {
    if (!savedExhibition) return;
    setBusy(true);
    setError(null);
    setSavedMessage(null);
    try {
      const patch: Record<string, string | boolean> = {};
      if (title.trim() !== savedExhibition.title) patch.title = title.trim();
      if (slug.trim() !== savedExhibition.slug) patch.slug = slug.trim();
      if (description.trim() !== (savedExhibition.description ?? "")) patch.description = description.trim();
      if (isAdmin && featured !== savedExhibition.featured) patch.featured = featured;

      let updated = savedExhibition;
      if (Object.keys(patch).length) {
        updated = await apiFetch<Exhibition>(`/api/exhibitions/${id}`, { method: "PATCH", body: JSON.stringify(patch) });
      }

      const dirtyIds = [...dirtyPlacementIds];
      const updatedPlacements = await Promise.all(dirtyIds.map((placementId) => {
        const placement = placements.find((item) => item.id === placementId);
        if (!placement) return Promise.reject(new Error("A selected placement is no longer available."));
        return apiFetch<ExhibitionPlacement>(`/api/exhibitions/${id}/placements/${placementId}`, {
          method: "PATCH",
          body: JSON.stringify(placementPatch(placement)),
        });
      }));

      if (nextStatus && updated.status !== nextStatus) {
        updated = await apiFetch<Exhibition>(`/api/exhibitions/${id}`, {
          method: "PATCH",
          body: JSON.stringify({ status: nextStatus }),
        });
      }

      setSavedExhibition(updated);
      setPlacements((current) => current.map((placement) => updatedPlacements.find((saved) => saved.id === placement.id) ?? placement));
      setDirtyPlacementIds(new Set());
      setSavedMessage(nextStatus === "published" ? "Exhibition published." : nextStatus === "archived" ? "Exhibition archived." : "Changes saved.");
    } catch (cause) {
      setError(readError(cause));
    } finally {
      setBusy(false);
    }
  }

  function changeWall(wallId: WallId) {
    if (!selectedPlacement) return;
    const along = selectedPlacement.wallId === "left" || selectedPlacement.wallId === "right"
      ? selectedPlacement.positionZ
      : selectedPlacement.positionX;
    const wallTransform = wallId === "front"
      ? { positionX: along, positionZ: -4.9, rotationY: 0 }
      : wallId === "back"
        ? { positionX: along, positionZ: 4.9, rotationY: 180 }
        : wallId === "left"
          ? { positionX: -4.9, positionZ: along, rotationY: 90 }
          : { positionX: 4.9, positionZ: along, rotationY: -90 };
    setPlacements((current) => current.map((placement) => placement.id === selectedPlacement.id
      ? { ...placement, ...wallTransform, wallId }
      : placement));
    markDirty(selectedPlacement.id);
  }

  function retryLoad() {
    exhibitionResource.refresh();
    placementsResource.refresh();
    artworksResource.refresh();
  }

  if (loading && !savedExhibition) {
    return <div className="grid gap-4 lg:grid-cols-[250px_minmax(0,1fr)_280px]"><Skeleton className="h-[620px] rounded-lg" /><Skeleton className="h-[620px] rounded-lg" /><Skeleton className="h-[620px] rounded-lg" /></div>;
  }

  if (loadError && !savedExhibition) {
    return <div className="rounded-lg border border-destructive bg-destructive-soft p-5 text-body-sm text-destructive-foreground">
      <p>Couldn&apos;t load this exhibition: {loadError}</p>
      <Button className="mt-4" size="sm" variant="outline" onClick={retryLoad}><RefreshCw className="size-3.5" /> Retry</Button>
    </div>;
  }

  if (!savedExhibition) return null;

  return (
    <>
      <div className="flex flex-col gap-4 xl:flex-row xl:items-end xl:justify-between">
        <div className="flex items-start gap-3">
          <Button asChild size="icon" variant="outline" aria-label="Back to exhibitions"><Link href="/exhibitions/manage"><ArrowLeft className="size-4" /></Link></Button>
          <div>
            <p className="eyebrow">Exhibition editor · {roomName}</p>
            <div className="mt-2 flex flex-wrap items-center gap-3">
              <Input aria-label="Exhibition name" className="w-full max-w-md font-display text-h3" maxLength={120} value={title} disabled={busy} onChange={(event) => setTitle(event.target.value)} />
              <span className="rounded-full border border-border bg-muted px-3 py-1 text-caption capitalize text-foreground">{savedExhibition.status}</span>
              {dirtyPlacementIds.size ? <span className="text-caption text-warning-foreground">{dirtyPlacementIds.size} layout {dirtyPlacementIds.size === 1 ? "change" : "changes"}</span> : null}
            </div>
          </div>
        </div>
        <div className="flex flex-wrap gap-2 xl:justify-end">
          <Button variant="outline" disabled={busy || invalidDetails} onClick={() => void saveChanges()}><Save className="size-4" /> {busy ? "Saving…" : "Save changes"}</Button>
          {savedExhibition.status === "draft" ? <Button disabled={busy || invalidDetails} onClick={() => void saveChanges("published")}>Publish</Button> : null}
          {savedExhibition.status === "published" ? <Button variant="outline" disabled={busy || invalidDetails} onClick={() => void saveChanges("archived")}>Archive</Button> : null}
          {savedExhibition.status === "published" ? <Button asChild size="icon" variant="outline" aria-label="Open public exhibition"><Link href={`/exhibitions/${savedExhibition.slug}`} target="_blank"><ExternalLink className="size-4" /></Link></Button> : null}
        </div>
      </div>

      <div className="mt-5 grid gap-4 lg:grid-cols-[250px_minmax(0,1fr)_280px]">
        <aside className="flex min-h-[420px] flex-col overflow-hidden rounded-lg border border-border bg-surface lg:h-[min(72vh,760px)]">
          <div className="border-b border-border px-4 py-3">
            <h2 className="font-medium text-foreground">Artworks</h2>
            <p className="mt-1 text-caption text-muted-foreground">Add from {isAdmin ? "all artists" : "your listings"}.</p>
          </div>
          <div className="flex-1 overflow-y-auto p-2">
            {artworksResource.loading ? <div className="grid gap-3 p-3"><Skeleton className="h-16 rounded-md" /><Skeleton className="h-16 rounded-md" /></div> : artworksResource.error ? (
              <p className="p-3 text-caption text-destructive-foreground">Artwork source could not be loaded. Use Retry below before adding work.</p>
            ) : artworks.length ? artworks.map((artwork) => {
              const placement = placements.find((item) => item.artworkId === artwork.id);
              return (
                <div key={artwork.id} className={`mb-2 rounded-md border p-3 ${placement?.id === selectedPlacementId ? "border-primary bg-muted/40" : "border-border"}`}>
                  <button className="focus-ring block w-full text-left" onClick={() => placement && setSelectedPlacementId(placement.id)} aria-label={placement ? `Select ${artwork.title} in the room` : artwork.title}>
                    <span className="block truncate text-body-sm font-medium text-foreground">{artwork.title}</span>
                    <span className="mt-1 flex flex-wrap items-center gap-1.5">{verificationBadge(artwork)}<span className="text-caption capitalize text-muted-foreground">{artwork.availability}</span></span>
                  </button>
                  <div className="mt-2">
                    {placement ? (
                      <span className="text-caption text-muted-foreground">In gallery</span>
                    ) : artwork.verificationStatus !== "verified" ? (
                      <Button size="sm" variant="outline" className="w-full" disabled title={`This artwork must pass verification before it can go in an exhibition (currently ${artwork.verificationStatus}).`}>
                        <Lock className="size-3.5" /> Needs verification
                      </Button>
                    ) : (
                      <Button size="sm" variant="outline" className="w-full" disabled={busy || placementsResource.loading || Boolean(placementsResource.error)} onClick={() => void addArtwork(artwork)}><Plus className="size-3.5" /> Add to gallery</Button>
                    )}
                  </div>
                </div>
              );
            }) : <p className="p-3 text-caption text-muted-foreground">No artworks are available for this account yet.</p>}
          </div>
          <div className="border-t border-border px-4 py-3 text-caption text-muted-foreground">{placements.length} placed · add/remove immediately · save transform edits</div>
        </aside>

        <section aria-label="3D gallery viewport" className="relative h-[420px] overflow-hidden rounded-lg border border-border bg-muted sm:h-[540px] lg:h-[min(72vh,760px)]">
          <ExhibitionBuilderViewportLoader roomTemplateId={savedExhibition.roomTemplateId} placedArtworks={placedArtworks} selectedPlacementId={selectedPlacementId} onSelect={setSelectedPlacementId} />
          {!placedArtworks.length ? (
            <div className="absolute inset-0 grid place-items-center p-6 text-center">
              <div className="max-w-sm rounded-lg border border-border bg-surface/95 p-6 shadow-sm">
                <h2 className="font-display text-h3 text-foreground">Your gallery is ready</h2>
                <p className="mt-2 text-body-sm text-muted-foreground">Add an artwork from the list to place it in the {roomName} room.</p>
              </div>
            </div>
          ) : null}
          <div className="pointer-events-none absolute bottom-3 left-3 rounded bg-surface/90 px-2.5 py-1.5 text-caption text-muted-foreground">Drag to orbit · scroll to zoom · select a frame to edit</div>
        </section>

        <aside className="min-h-[420px] rounded-lg border border-border bg-surface p-4 lg:h-[min(72vh,760px)] lg:overflow-y-auto">
          <div className="border-b border-border pb-3">
            <h2 className="font-medium text-foreground">Properties</h2>
            {selectedArtwork ? <p className="mt-1 truncate text-caption text-muted-foreground">{selectedArtwork.title}</p> : <p className="mt-1 text-caption text-muted-foreground">Select an artwork in the gallery.</p>}
          </div>
          {selectedPlacement ? (
            <div className="grid gap-4 pt-4">
              <label className="grid gap-1.5 text-caption font-medium text-foreground">Wall
                <select className="focus-ring h-10 w-full rounded-md border border-border bg-surface px-3 text-body-sm" value={WALLS.some((wall) => wall.id === selectedPlacement.wallId) ? selectedPlacement.wallId : "front"} disabled={busy} onChange={(event) => changeWall(event.target.value as WallId)}>
                  {WALLS.map((wall) => <option key={wall.id} value={wall.id}>{wall.label}</option>)}
                </select>
              </label>
              {TRANSFORM_GROUPS.map((group) => (
                <fieldset key={group.title} className="grid grid-cols-3 gap-2">
                  <legend className="col-span-3 mb-2 text-caption font-medium text-foreground">{group.title}</legend>
                  {group.fields.map((field) => (
                    <label key={field.name} className="grid gap-1 text-caption text-muted-foreground">
                      {field.label}
                      <Input type="number" min={field.min} max={field.max} step={field.step} value={selectedPlacement[field.name]} disabled={busy} aria-label={`${group.title} ${field.label}`} onChange={(event) => {
                        if (event.target.value.trim()) updateTransform(field.name, Number(event.target.value));
                      }} />
                    </label>
                  ))}
                </fieldset>
              ))}
              <label className="grid gap-1.5 text-caption font-medium text-foreground">Scale
                <Input type="number" min={0.01} max={5} step={0.05} value={selectedPlacement.scale} disabled={busy} onChange={(event) => {
                  if (event.target.value.trim()) updateTransform("scale", Number(event.target.value));
                }} />
              </label>
              <label className="grid gap-1.5 text-caption font-medium text-foreground">Frame
                <select className="focus-ring h-10 w-full rounded-md border border-border bg-surface px-3 text-body-sm" value={FRAME_STYLES.some((style) => style.id === selectedPlacement.frameStyle) ? selectedPlacement.frameStyle : "dark-wood"} disabled={busy} onChange={(event) => {
                  const frameStyle = event.target.value as FrameStyle;
                  setPlacements((current) => current.map((placement) => placement.id === selectedPlacement.id ? { ...placement, frameStyle } : placement));
                  markDirty(selectedPlacement.id);
                }}>
                  {FRAME_STYLES.map((style) => <option key={style.id} value={style.id}>{style.label}</option>)}
                </select>
              </label>
              {selectedArtwork ? <div className="rounded-md bg-muted/40 p-3 text-caption text-muted-foreground">
                <p>{selectedArtwork.widthCm} × {selectedArtwork.heightCm} cm</p>
                <p className="mt-1">Availability: <span className="capitalize">{selectedArtwork.availability}</span></p>
                <p className="mt-1">Review status: {selectedArtwork.verificationStatus === "verified" ? "Verified" : selectedArtwork.verificationStatus === "rejected" ? "Rejected" : "Pending review"}</p>
              </div> : null}
              <Button variant="outline" className="text-destructive-foreground" disabled={busy} onClick={() => void removeSelectedPlacement()}><Trash2 className="size-4" /> Remove from gallery</Button>
            </div>
          ) : (
            <p className="pt-4 text-body-sm text-muted-foreground">Add an artwork or select one from the room to edit its placement.</p>
          )}
          <div className="mt-5 border-t border-border pt-4">
            <label className="grid gap-1.5 text-caption font-medium text-foreground">Exhibition link
              <Input value={slug} maxLength={120} disabled={busy} onChange={(event) => setSlug(event.target.value.toLowerCase().replace(/[^a-z0-9-]/g, "").replace(/-{2,}/g, "-").replace(/^-+|-+$/g, ""))} />
            </label>
            <label className="mt-3 grid gap-1.5 text-caption font-medium text-foreground">Description
              <textarea className="focus-ring min-h-24 w-full rounded-md border border-border bg-surface px-3 py-2 text-body-sm text-foreground" maxLength={2000} value={description} disabled={busy} onChange={(event) => setDescription(event.target.value)} />
            </label>
            {isAdmin ? <label className="mt-3 flex items-center gap-2 text-body-sm text-foreground">
              <input type="checkbox" checked={featured} disabled={busy} onChange={(event) => setFeatured(event.target.checked)} /> Feature on Atelier
            </label> : null}
          </div>
        </aside>
      </div>

      {error ? <div role="alert" className="mt-4 rounded-md border border-destructive bg-destructive-soft px-4 py-3 text-body-sm text-destructive-foreground">{error}</div> : null}
      {savedMessage ? <p role="status" className="mt-3 flex items-center gap-2 text-body-sm text-success-foreground"><Check className="size-4" /> {savedMessage}</p> : null}
      {loadError && savedExhibition ? <div className="mt-4 flex items-center justify-between gap-3 rounded-md border border-destructive bg-destructive-soft px-4 py-3 text-body-sm text-destructive-foreground"><span>Some editor data could not be loaded: {loadError}</span><Button size="sm" variant="outline" onClick={retryLoad}>Retry</Button></div> : null}
    </>
  );
}
