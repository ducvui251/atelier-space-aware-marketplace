import Image from "next/image";
import {
  Box,
  LayoutPanelLeft,
  Maximize2,
  Scale,
  Sofa,
} from "lucide-react";
import { rooms } from "@/data";
import { Button } from "@/components/ui/button";
import { FilterChip } from "@/components/discovery/FilterChip";
import { cn } from "@/lib/utils";
import { getArtworks } from "@/features/artworks/services/artwork.service";

export async function RoomPlaceholder() {
  const all = await getArtworks();
  const featured = all[0];
  const secondary = all.slice(1, 6);

  return (
    <div className="mt-8 grid gap-6 lg:grid-cols-[1fr_320px]">
        {/* Room canvas */}
        <div className="relative aspect-[4/3] overflow-hidden rounded-xl bg-foreground/90 shadow-md md:aspect-[16/10]">
          <Image
            src="https://picsum.photos/seed/room-living/1400/900"
            alt="Living room preview placeholder"
            fill
            sizes="(max-width: 1024px) 100vw, 70vw"
            className="object-cover opacity-80"
          />

          {/* frame + selected artwork overlay */}
          <div className="absolute left-[22%] top-[14%] aspect-[9/11] w-[30%]">
            <div className="relative h-full w-full overflow-hidden rounded-sm border-[10px] border-surface/80 bg-muted shadow-lg">
              <Image
                src={featured.imageUrl}
                alt={featured.title}
                fill
                sizes="30vw"
                className="object-cover"
              />
            </div>
            <p className="mt-2 truncate text-center text-caption text-surface/80">
              {featured.title}
            </p>
          </div>

          {/* scale/zoom controls (visual only) */}
          <div className="absolute bottom-4 right-4 flex items-center gap-1 rounded-full bg-surface/85 px-2 py-1.5 backdrop-blur-sm">
            <button
              type="button"
              aria-label="Increase size"
              className="focus-ring flex size-8 items-center justify-center rounded-full text-foreground hover:bg-muted"
            >
              <Maximize2 className="size-4" />
            </button>
            <button
              type="button"
              aria-label="Adjust scale"
              className="focus-ring flex size-8 items-center justify-center rounded-full text-foreground hover:bg-muted"
            >
              <Scale className="size-4" />
            </button>
          </div>
        </div>

        {/* Control rail */}
        <aside className="flex flex-col gap-6">
          <div className="rounded-lg border border-border bg-surface p-4">
            <p className="eyebrow mb-3">Artwork</p>
            <div className="flex gap-2 overflow-x-auto pb-1">
              {secondary.map((artwork) => (
                <button
                  key={artwork.id}
                  aria-label={`Preview ${artwork.title}`}
                  className="focus-ring relative h-16 w-14 shrink-0 overflow-hidden rounded-md bg-muted"
                >
                  <Image
                    src={artwork.imageUrl}
                    alt={artwork.title}
                    fill
                    sizes="56px"
                    className="object-cover"
                  />
                </button>
              ))}
            </div>
            <Button variant="outline" size="sm" className="mt-3 w-full">
              <LayoutPanelLeft className="size-4" />
              Change artwork
            </Button>
          </div>

          <div className="rounded-lg border border-border bg-surface p-4">
            <p className="eyebrow mb-3">Room</p>
            <div className="flex flex-wrap gap-2">
              {rooms.map((room) => (
                <FilterChip key={room.id} label={room.name} selected={room.id === "room-living"} />
              ))}
            </div>
            <Button variant="outline" size="sm" className="mt-3 w-full">
              <Sofa className="size-4" />
              Change room
            </Button>
          </div>

          <div className="rounded-lg border border-border bg-surface p-4">
            <p className="eyebrow mb-3">Scale</p>
            <Button variant="outline" size="sm" className="w-full">
              <Scale className="size-4" />
              Adjust size
            </Button>
          </div>

          <Button
            variant="primary"
            size="default"
            disabled
            title="Coming in a later step"
            className={cn("w-full opacity-80", "cursor-not-allowed")}
          >
            <Box className="size-4" />
            Enter 3D View
          </Button>
        </aside>
      </div>
  );
}
