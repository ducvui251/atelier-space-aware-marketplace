"use client";

import dynamic from "next/dynamic";
import type { Artwork } from "@atelier/contracts";

const ExhibitionDemoScene = dynamic(
  () => import("./ExhibitionDemoScene").then((mod) => mod.ExhibitionDemoScene),
  { ssr: false },
);

interface ExhibitionDemoSceneLoaderProps {
  artworks?: Artwork[];
}

export function ExhibitionDemoSceneLoader({ artworks }: ExhibitionDemoSceneLoaderProps) {
  return <ExhibitionDemoScene artworks={artworks} />;
}
