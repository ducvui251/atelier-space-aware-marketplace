import type { Metadata } from "next";
import { PageContainer } from "@/components/layout/PageContainer";
import { Info } from "lucide-react";
import { RoomPlaceholder } from "@/components/room/RoomPlaceholder";
import { DualViewToggle } from "@/components/discovery/DualViewToggle";

export const metadata: Metadata = {
  title: "View in a Room",
  description:
    "A static preview of the room-based discovery experience, before the live 3D engine.",
};

export default function RoomsPage() {
  return (
    <PageContainer className="py-10">
      <div className="flex flex-col gap-2 md:flex-row md:items-start md:justify-between">
        <div>
          <p className="eyebrow">Art for your space</p>
          <h1 className="mt-2 font-display text-h1 text-foreground">
            See it against your walls.
          </h1>
          <p className="mt-3 max-w-2xl text-body text-muted-foreground">
            A live 3D room preview is coming. This shows the direction: pick a
            room, place a work, and tune its scale before you buy.
          </p>
        </div>
        <DualViewToggle className="shrink-0" />
      </div>

      <div className="mt-6 inline-flex items-center gap-2 rounded-full border border-border bg-surface px-4 py-2 text-caption text-muted-foreground">
        <Info className="size-4 text-subdued" />
        Static direction preview — interactive 3D arrives in a later step.
      </div>

      <RoomPlaceholder />
    </PageContainer>
  );
}
