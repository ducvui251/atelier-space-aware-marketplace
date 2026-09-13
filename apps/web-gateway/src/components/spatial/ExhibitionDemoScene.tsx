"use client";

import { SpatialCanvas } from "./SpatialCanvas";
import { ExhibitionScene } from "./exhibition/ExhibitionScene";

export function ExhibitionDemoScene() {
  return (
    <div className="h-[70vh] w-full overflow-hidden rounded-lg border border-border">
      <SpatialCanvas cameraPosition={[0, 1.6, 2.5]}>
        <ExhibitionScene />
      </SpatialCanvas>
    </div>
  );
}
