"use client";

import dynamic from "next/dynamic";
import type { PlacedArtwork } from "./exhibition/ExhibitionLiveScene";
import type { SceneWall } from "@atelier/contracts";

const ExhibitionViewer = dynamic(
  () => import("./ExhibitionViewer").then((mod) => mod.ExhibitionViewer),
  { ssr: false },
);

interface ExhibitionViewerLoaderProps {
  title: string;
  roomTemplateId?: string;
  roomWidth?: number;
  roomDepth?: number;
  wallColor?: string;
  wallSegments?: SceneWall[];
  placedArtworks: PlacedArtwork[];
  onExit: () => void;
}

export function ExhibitionViewerLoader(props: ExhibitionViewerLoaderProps) {
  return <ExhibitionViewer {...props} />;
}
