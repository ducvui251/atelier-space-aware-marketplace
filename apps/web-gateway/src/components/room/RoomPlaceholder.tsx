"use client";

import * as React from "react";
import Image from "next/image";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { Trash2 } from "lucide-react";
import { FilterChip } from "@/components/discovery/FilterChip";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { artworkAspect } from "@/lib/artwork-aspect";
import { useAuth, useApiResource } from "@/lib/client/hooks";
import { apiFetch, ApiError } from "@/lib/client/api";
import type { Artwork, BuyerRoom, Placement, RoomPreset } from "@/types";

interface SavedRoomEntry {
  room: BuyerRoom;
  placement: Placement;
  artwork: Artwork | null;
}

export function RoomPlaceholder({ artworks, rooms }: { artworks: Artwork[]; rooms: RoomPreset[] }) {
  const router = useRouter();
  const { currentUser } = useAuth();
  const searchParams = useSearchParams();
  const queryArtworkId = searchParams.get("artwork");
  const available = artworks;

  const [roomId, setRoomId] = React.useState(rooms[0]?.id ?? "");
  const [artworkId, setArtworkId] = React.useState<string>(queryArtworkId ?? available[0]?.id ?? "");
  const [scale, setScale] = React.useState(1);
  const [saving, setSaving] = React.useState(false);
  const [savedMessage, setSavedMessage] = React.useState<string | null>(null);

  const { data: saved, refresh: refreshSaved } = useApiResource<{ items: SavedRoomEntry[] }>(currentUser ? "/api/rooms/saved" : null);

  React.useEffect(() => {
    if (queryArtworkId) setArtworkId(queryArtworkId);
  }, [queryArtworkId]);

  const room = rooms.find((r) => r.id === roomId) ?? rooms[0];
  const artwork = available.find((a) => a.id === artworkId) ?? available[0];

  if (!room || !artwork) return null;

  const baseWidthPct =
    artwork.orientation === "landscape" ? 34 : artwork.orientation === "square" ? 26 : 22;
  const widthPct = Math.round(baseWidthPct * scale);

  async function saveRoom() {
    if (!currentUser) {
      router.push("/login");
      return;
    }
    setSaving(true);
    setSavedMessage(null);
    try {
      const savedRoom = await apiFetch<{ id: string }>("/api/rooms", {
        method: "POST",
        body: JSON.stringify({ name: room.name, roomType: room.id, imageUrl: room.imageUrl }),
      });
      await apiFetch(`/api/rooms/${encodeURIComponent(savedRoom.id)}/placements`, {
        method: "POST",
        body: JSON.stringify({ artworkId: artwork.id, scale, positionX: 50, positionY: 14, rotation: 0 }),
      });
      setSavedMessage("Đã lưu cách bố trí này.");
      refreshSaved();
    } catch (error) {
      setSavedMessage(error instanceof ApiError ? error.message : "Không thể lưu. Vui lòng thử lại.");
    } finally {
      setSaving(false);
    }
  }

  async function removeSaved(entry: SavedRoomEntry) {
    await apiFetch(`/api/rooms/${encodeURIComponent(entry.room.id)}/placements/${encodeURIComponent(entry.placement.id)}`, { method: "DELETE" });
    refreshSaved();
  }

  return (
    <div className="mt-8 flex flex-col gap-10">
      <div className="grid gap-6 lg:grid-cols-[1fr_320px]">
        {/* Room canvas */}
        <div className="relative aspect-[4/3] overflow-hidden rounded-xl bg-foreground/90 shadow-md md:aspect-[16/10]">
          <Image
            src={room.imageUrl}
            alt={`${room.name} preview`}
            fill
            sizes="(max-width: 1024px) 100vw, 70vw"
            className="object-cover opacity-85"
          />

          <div
            className="absolute left-1/2 top-[14%] -translate-x-1/2"
            style={{ width: `${widthPct}%` }}
          >
            <div
              className={cn(
                "relative w-full overflow-hidden rounded-sm border-[10px] border-surface/80 bg-muted shadow-lg",
                artworkAspect(artwork.orientation),
              )}
            >
              <Image src={artwork.imageUrl} alt={artwork.title} fill sizes="30vw" className="object-cover" />
            </div>
            <p className="mt-2 truncate text-center text-caption text-surface/90">{artwork.title}</p>
          </div>
        </div>

        {/* Control rail */}
        <aside className="flex flex-col gap-6">
          <div className="rounded-lg border border-border bg-surface p-4">
            <p className="eyebrow mb-3">Artwork</p>
            <div className="flex gap-2 overflow-x-auto pb-1">
              {available.slice(0, 10).map((a) => (
                <button
                  key={a.id}
                  type="button"
                  aria-label={`Preview ${a.title}`}
                  onClick={() => setArtworkId(a.id)}
                  className={cn(
                    "focus-ring relative h-16 w-14 shrink-0 overflow-hidden rounded-md bg-muted",
                    a.id === artwork.id && "ring-2 ring-foreground ring-offset-1",
                  )}
                >
                  <Image src={a.imageUrl} alt={a.title} fill sizes="56px" className="object-cover" />
                </button>
              ))}
            </div>
          </div>

          <div className="rounded-lg border border-border bg-surface p-4">
            <p className="eyebrow mb-3">Room</p>
            <div className="flex flex-wrap gap-2">
              {rooms.map((r) => (
                <FilterChip
                  key={r.id}
                  label={r.name}
                  selected={r.id === roomId}
                  onClick={() => setRoomId(r.id)}
                />
              ))}
            </div>
          </div>

          <div className="rounded-lg border border-border bg-surface p-4">
            <p className="eyebrow mb-3">Scale</p>
            <input
              type="range"
              min={0.6}
              max={1.6}
              step={0.05}
              value={scale}
              onChange={(e) => setScale(Number(e.target.value))}
              className="w-full"
              aria-label="Adjust artwork scale"
            />
          </div>

          <div className="flex flex-col gap-2">
            <Button onClick={saveRoom} disabled={saving}>
              {saving ? "Đang lưu…" : "Lưu cách bố trí này"}
            </Button>
            {savedMessage ? (
              <p role="status" className="text-caption text-muted-foreground">
                {savedMessage}
              </p>
            ) : null}
          </div>
        </aside>
      </div>

      {currentUser && saved && saved.items.length > 0 ? (
        <div>
          <p className="eyebrow mb-3">Đã lưu ({saved.items.length})</p>
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-4">
            {saved.items.map((entry) => (
              <div key={entry.placement.id} className="group relative overflow-hidden rounded-lg border border-border bg-surface">
                {entry.artwork ? (
                  <Link href={`/artworks/${entry.artwork.id}`} className="block">
                    <div className="relative aspect-square bg-muted">
                      <Image src={entry.artwork.imageUrl} alt={entry.artwork.title} fill sizes="200px" className="object-cover" />
                    </div>
                    <div className="p-2">
                      <p className="truncate text-caption font-medium text-foreground">{entry.artwork.title}</p>
                      <p className="truncate text-caption text-muted-foreground">{entry.room.name}</p>
                    </div>
                  </Link>
                ) : (
                  <div className="p-2 text-caption text-muted-foreground">Tác phẩm không còn tồn tại</div>
                )}
                <button
                  type="button"
                  aria-label="Xoá cách bố trí đã lưu"
                  onClick={() => removeSaved(entry)}
                  className="focus-ring absolute right-2 top-2 flex size-7 items-center justify-center rounded-full bg-background/90 text-foreground opacity-0 transition-opacity hover:bg-destructive-soft hover:text-destructive group-hover:opacity-100"
                >
                  <Trash2 className="size-3.5" />
                </button>
              </div>
            ))}
          </div>
        </div>
      ) : null}
    </div>
  );
}

