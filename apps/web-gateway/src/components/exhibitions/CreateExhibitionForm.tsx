"use client";

import { useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import type { Exhibition, ExhibitionRoomTemplateId, ExhibitionSceneDocument } from "@atelier/contracts";
import { EXHIBITION_BUILDER_ROOM_TEMPLATE_ID } from "@atelier/contracts";
import { apiFetch, ApiError } from "@/lib/client/api";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { EXHIBITION_ROOM_OPTIONS } from "./exhibition-room-options";

function makeSlug(value: string) {
  return value.toLowerCase().trim().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "").slice(0, 120);
}

export function CreateExhibitionForm({
  startMode = "premade",
  roomTemplateId: selectedRoomTemplateId,
  scene,
  hideRoomStyle = false,
}: {
  startMode?: "premade" | "custom";
  roomTemplateId?: ExhibitionRoomTemplateId;
  scene?: ExhibitionSceneDocument;
  hideRoomStyle?: boolean;
}) {
  const router = useRouter();
  const customMode = startMode === "custom";
  const [title, setTitle] = useState("");
  const [slug, setSlug] = useState("");
  const [slugEdited, setSlugEdited] = useState(false);
  const [description, setDescription] = useState("");
  const [roomTemplateId, setRoomTemplateId] = useState<ExhibitionRoomTemplateId>(EXHIBITION_BUILDER_ROOM_TEMPLATE_ID);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setBusy(true);
    setError(null);
    try {
      const exhibition = await apiFetch<Exhibition>("/api/exhibitions", {
        method: "POST",
        body: JSON.stringify({ title, slug, description, roomTemplateId: selectedRoomTemplateId ?? roomTemplateId, scene }),
      });
      router.replace(`/exhibitions/manage/${exhibition.id}${startMode === "custom" ? "?mode=custom" : ""}`);
    } catch (cause) {
      setError(cause instanceof ApiError ? cause.message : "Could not create exhibition. Please try again.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="max-w-2xl rounded-lg border border-border bg-surface p-5 sm:p-7">
      <div className="grid gap-5">
        <label className="grid gap-2 text-body-sm font-medium text-foreground">
          Exhibition name
          <Input value={title} maxLength={120} required onChange={(event) => {
            setTitle(event.target.value);
            if (!slugEdited) setSlug(makeSlug(event.target.value));
          }} />
        </label>
        <label className="grid gap-2 text-body-sm font-medium text-foreground">
          Public link
          <div className="flex items-center gap-2">
            <span className="shrink-0 text-caption text-muted-foreground">/exhibitions/</span>
            <Input value={slug} maxLength={120} pattern="[a-z0-9]+(-[a-z0-9]+)*" required onChange={(event) => {
              setSlugEdited(true);
              setSlug(makeSlug(event.target.value));
            }} />
          </div>
        </label>
        <label className="grid gap-2 text-body-sm font-medium text-foreground">
          Description <span className="font-normal text-muted-foreground">Optional</span>
          <textarea className="focus-ring min-h-28 w-full rounded-md border border-border bg-surface px-3 py-2 text-body-sm text-foreground" maxLength={2000} value={description} onChange={(event) => setDescription(event.target.value)} />
        </label>
        {!hideRoomStyle ? <fieldset className="grid gap-2">
          <legend className="text-body-sm font-medium text-foreground">{customMode ? "Custom room appearance" : "Pre-made room style"}</legend>
          <p className="text-caption text-muted-foreground">
            {customMode
              ? "Choose the visual finish now, then define the room shape in Exhibition Editor V2 after creating the draft."
              : "Choose a visual style for the legacy 10 × 10 m exhibition room."}
          </p>
          <div className="grid gap-3 sm:grid-cols-3">
            {EXHIBITION_ROOM_OPTIONS.map((option) => {
              const selected = roomTemplateId === option.id;
              return (
                <label key={option.id} className={`grid cursor-pointer gap-3 rounded-md border p-3 text-left transition-colors ${selected ? "border-primary bg-muted/50" : "border-border hover:bg-muted/30"}`}>
                  <input
                    className="peer sr-only"
                    type="radio"
                    name="roomTemplateId"
                    value={option.id}
                    checked={selected}
                    onChange={() => setRoomTemplateId(option.id)}
                  />
                  <span aria-hidden="true" className="flex h-10 overflow-hidden rounded-sm border border-border peer-focus-visible:ring-2 peer-focus-visible:ring-ring peer-focus-visible:ring-offset-2">
                    {option.swatches.map((swatch, index) => <span key={`${option.id}-${index}`} className={`flex-1 ${swatch}`} />)
                    }
                  </span>
                  <span>
                    <span className="block text-body-sm font-medium text-foreground">{option.name}</span>
                    <span className="mt-1 block text-caption text-muted-foreground">{option.description}</span>
                  </span>
                </label>
              );
            })}
          </div>
        </fieldset> : null}
        <div className="rounded-md border border-border bg-muted/30 p-3">
          <p className="text-caption font-medium text-foreground">What happens next</p>
          <p className="mt-1 text-caption text-muted-foreground">
            {customMode
              ? "After creating the draft you will open Define Space V2 to draw walls and shape the floor plan."
              : "After creating the draft you will open the pre-made 10 × 10 m room to place artwork and publish when ready."}
            {" The chosen gallery style sets the wall colour, floor and lighting."}
          </p>
        </div>
        {error ? <p role="alert" className="text-body-sm text-destructive-foreground">{error}</p> : null}
        <div className="flex flex-wrap gap-3">
          <Button type="submit" disabled={busy || !title.trim() || !slug.trim()}>{busy ? "Creating…" : customMode ? "Create draft & open custom editor" : "Create draft & open room"}</Button>
          <Button type="button" variant="outline" onClick={() => router.push("/exhibitions/manage")}>Cancel</Button>
        </div>
      </div>
    </form>
  );
}
