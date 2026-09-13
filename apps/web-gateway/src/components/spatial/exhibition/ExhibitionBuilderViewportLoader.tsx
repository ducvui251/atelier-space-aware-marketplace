"use client";

import dynamic from "next/dynamic";
import type { ExhibitionBuilderViewportProps } from "./ExhibitionBuilderViewport";

const ExhibitionBuilderViewport = dynamic(
  () => import("./ExhibitionBuilderViewport").then((mod) => mod.ExhibitionBuilderViewport),
  { ssr: false },
);

export function ExhibitionBuilderViewportLoader(props: ExhibitionBuilderViewportProps) {
  return <ExhibitionBuilderViewport {...props} />;
}
