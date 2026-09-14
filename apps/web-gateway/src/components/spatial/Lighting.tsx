"use client";

import { EXHIBITION_BUILDER_ROOM_TEMPLATE_ID } from "@atelier/contracts";

const ROOM_LIGHTING: Record<string, { ambient: number; directional: number; color: string }> = {
  "white-cube": { ambient: 0.6, directional: 1.1, color: "#ffffff" },
  "warm-gallery": { ambient: 0.7, directional: 0.9, color: "#ffe6bf" },
  "black-box": { ambient: 0.28, directional: 0.65, color: "#fff0d8" },
};

export function Lighting({ templateId = EXHIBITION_BUILDER_ROOM_TEMPLATE_ID }: { templateId?: string }) {
  const lighting = ROOM_LIGHTING[templateId] ?? ROOM_LIGHTING[EXHIBITION_BUILDER_ROOM_TEMPLATE_ID];

  return (
    <>
      <ambientLight intensity={lighting.ambient} />
      <directionalLight
        position={[4, 6, 4]}
        intensity={lighting.directional}
        color={lighting.color}
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
