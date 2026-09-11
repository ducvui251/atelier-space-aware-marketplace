import type { Metadata } from "next";
import { Suspense } from "react";
import { PageContainer } from "@/components/layout/PageContainer";
import { RoomPlaceholder } from "@/components/room/RoomPlaceholder";
import { DualViewToggle } from "@/components/discovery/DualViewToggle";
import { listArtworks } from "@/lib/gateway/clients/artwork.client";
import { listRooms } from "@/lib/gateway/clients/room-preview.client";
import type { Artwork, RoomPreset } from "@/types";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "View in a Room",
  description: "Preview an artwork against a room template and adjust its scale.",
};

export default async function RoomsPage() {
  const [artworks, rooms] = await Promise.all([
    listArtworks().catch(() => [] as Artwork[]),
    listRooms().catch(() => [] as RoomPreset[]),
  ]);
  const available = artworks.filter((artwork) => artwork.availability === "available");

  return (
    <PageContainer className="py-10">
      <div className="flex flex-col gap-2 md:flex-row md:items-start md:justify-between">
        <div>
          <p className="eyebrow">Art for your space</p>
          <h1 className="mt-2 font-display text-h1 text-foreground">
            See it against your walls.
          </h1>
          <p className="mt-3 max-w-2xl text-body text-muted-foreground">
            Choose a room, pick an artwork, and adjust the scale to visualize it before you buy.
          </p>
        </div>
        <DualViewToggle className="shrink-0" />
      </div>

      <Suspense fallback={null}>
        <RoomPlaceholder artworks={available} rooms={rooms} />
      </Suspense>
    </PageContainer>
  );
}
