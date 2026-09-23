"use client";

import { EXHIBITION_BUILDER_ROOM_TEMPLATE_ID } from "@atelier/contracts";
import type { ExhibitionSceneStyle } from "@atelier/contracts";

const ROOM_LIGHTING: Record<string, { ambient: number; directional: number; color: string }> = {
  "white-cube": { ambient: 0.6, directional: 1.1, color: "#ffffff" },
  "warm-gallery": { ambient: 0.7, directional: 0.9, color: "#ffe6bf" },
  "black-box": { ambient: 0.28, directional: 0.65, color: "#fff0d8" },
};

export function Lighting({ templateId = EXHIBITION_BUILDER_ROOM_TEMPLATE_ID, style }: { templateId?: string; style?: ExhibitionSceneStyle }) {
  const lighting = ROOM_LIGHTING[templateId] ?? ROOM_LIGHTING[EXHIBITION_BUILDER_ROOM_TEMPLATE_ID];

  return (
    <>
      <ambientLight intensity={style?.ambientLightIntensity ?? lighting.ambient} color={style?.lightColor} />
      <directionalLight
        position={[4, 6, 4]}
        intensity={style?.directionalLightIntensity ?? lighting.directional}
        color={style?.lightColor ?? lighting.color}
      />
      {templateId === "black-box" ? (
        <>
          <pointLight position={[-2.5, 2.9, -2]} color="#fff0d8" intensity={4} distance={7} decay={2} />
          <pointLight position={[2.5, 2.9, -2]} color="#fff0d8" intensity={4} distance={7} decay={2} />
          <pointLight position={[-2.5, 2.9, 2]} color="#fff0d8" intensity={4} distance={7} decay={2} />
          <pointLight position={[2.5, 2.9, 2]} color="#fff0d8" intensity={4} distance={7} decay={2} />
        </>
      ) : null}
    </>
  );
}
