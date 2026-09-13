"use client";

import dynamic from "next/dynamic";

const ExhibitionDemoScene = dynamic(
  () => import("./ExhibitionDemoScene").then((mod) => mod.ExhibitionDemoScene),
  { ssr: false },
);

export function ExhibitionDemoSceneLoader() {
  return <ExhibitionDemoScene />;
}
