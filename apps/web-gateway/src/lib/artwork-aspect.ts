import type { ArtworkOrientation } from "@/types";

export function artworkAspect(orientation: ArtworkOrientation): string {
  switch (orientation) {
    case "portrait":
      return "aspect-[9/11]";
    case "landscape":
      return "aspect-[11/8]";
    case "square":
      return "aspect-square";
  }
}
