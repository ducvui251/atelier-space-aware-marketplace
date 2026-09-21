import type { SceneWall } from "@atelier/contracts";

/** The legacy exhibition renderer's fixed four-wall room footprint. */
export const EXHIBITION_BOX_WIDTH = 10;
export const EXHIBITION_BOX_DEPTH = 10;
export const EXHIBITION_BOX_HEIGHT = 3.2;
export const EXHIBITION_BOX_WALL_THICKNESS = 0.15;

export function createExhibitionBoxWalls(
  width = EXHIBITION_BOX_WIDTH,
  depth = EXHIBITION_BOX_DEPTH,
  height = EXHIBITION_BOX_HEIGHT,
  thickness = EXHIBITION_BOX_WALL_THICKNESS,
): SceneWall[] {
  const halfWidth = width / 2;
  const halfDepth = depth / 2;
  return [
    { id: "front", start: [-halfWidth, -halfDepth], end: [halfWidth, -halfDepth], height, thickness },
    { id: "back", start: [halfWidth, halfDepth], end: [-halfWidth, halfDepth], height, thickness },
    { id: "left", start: [-halfWidth, halfDepth], end: [-halfWidth, -halfDepth], height, thickness },
    { id: "right", start: [halfWidth, -halfDepth], end: [halfWidth, halfDepth], height, thickness },
  ];
}
