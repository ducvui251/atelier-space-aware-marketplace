"use client";

import * as React from "react";
import Image from "next/image";
import { useSearchParams } from "next/navigation";
import { rooms } from "@/data";
import { FilterChip } from "@/components/discovery/FilterChip";
import { cn } from "@/lib/utils";
import { artworkAspect } from "@/lib/artwork-aspect";
import { useAppState } from "@/lib/store/hooks";

export function RoomPlaceholder() {
  const { db } = useAppState();
  const searchParams = useSearchParams();
  const queryArtworkId = searchParams.get("artwork");
  const available = db.artworks.filter((a) => a.availability === "available");

  const [roomId, setRoomId] = React.useState(rooms[0].id);
  const [artworkId, setArtworkId] = React.useState<string>(queryArtworkId ?? available[0]?.id ?? "");
  const [scale, setScale] = React.useState(1);

  React.useEffect(() => {
    if (queryArtworkId) setArtworkId(queryArtworkId);
  }, [queryArtworkId]);

  const room = rooms.find((r) => r.id === roomId) ?? rooms[0];
  const artwork = db.artworks.find((a) => a.id === artworkId) ?? available[0];

  if (!room || !artwork) return null;

  const baseWidthPct =
    artwork.orientation === "landscape" ? 34 : artwork.orientation === "square" ? 26 : 22;
  const widthPct = Math.round(baseWidthPct * scale);

  return (
    <div className="mt-8 grid gap-6 lg:grid-cols-[1fr_320px]">
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
      </aside>
    </div>
  );
}
