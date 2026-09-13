"use client";

import { SpatialCanvas } from "./SpatialCanvas";
import { Lighting } from "./Lighting";
import { RoomEnvironment } from "./RoomEnvironment";

export function ExhibitionDemoScene() {
  return (
    <div className="h-[70vh] w-full overflow-hidden rounded-lg border border-border">
      <SpatialCanvas>
        <Lighting />
        <RoomEnvironment />
      </SpatialCanvas>
    </div>
  );
}
