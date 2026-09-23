"use client";

import dynamic from "next/dynamic";
import type { PlacedArtwork } from "./exhibition/ExhibitionLiveScene";
import type { ExhibitionSceneDoor, ExhibitionSceneImagePlacement, ExhibitionSceneStyle, SceneWall } from "@atelier/contracts";

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
  doors?: ExhibitionSceneDoor[];
  style?: ExhibitionSceneStyle;
  imagePlacements?: ExhibitionSceneImagePlacement[];
  placedArtworks: PlacedArtwork[];
  onExit: () => void;
}

export function ExhibitionViewerLoader(props: ExhibitionViewerLoaderProps) {
  return <ExhibitionViewer {...props} />;
}
