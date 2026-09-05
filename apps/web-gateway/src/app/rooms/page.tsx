import type { Metadata } from "next";
import { Suspense } from "react";
import { PageContainer } from "@/components/layout/PageContainer";
import { RoomPlaceholder } from "@/components/room/RoomPlaceholder";
import { DualViewToggle } from "@/components/discovery/DualViewToggle";

export const metadata: Metadata = {
  title: "View in a Room",
  description: "Preview an artwork against a room template and adjust its scale.",
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
            Chọn phòng, chọn tác phẩm và chỉnh tỉ lệ để hình dung trước khi mua.
          </p>
        </div>
        <DualViewToggle className="shrink-0" />
      </div>

      <Suspense fallback={null}>
        <RoomPlaceholder />
      </Suspense>
    </PageContainer>
  );
}
