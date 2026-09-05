import type { Collection } from "@/types";
import { landscapeImage, portraitImage } from "./images";

export const collections: Collection[] = [
  {
    id: "col-warm-minimal",
    title: "Warm Minimal",
    description: "Quiet, sunlit works in bone, clay, and sand for calm, spacious rooms.",
    imageUrl: portraitImage("col-warm"),
    artworkCount: 18,
  },
  {
    id: "col-oxblood",
    title: "The Oxblood Edit",
    description: "Deep, grounded color and tactile surfaces for spaces with a bit of weight.",
    imageUrl: landscapeImage("col-oxblood"),
    artworkCount: 24,
  },
  {
    id: "col-still-life",
    title: "Still Life & Interior",
    description: "Windows, rooms, and quiet objects — paintings that make a house feel lived-in.",
    imageUrl: landscapeImage("col-still"),
    artworkCount: 31,
  },
  {
    id: "col-shadows",
    title: "Light & Shadow",
    description: "Photography and monochrome works that study the drama of natural light.",
    imageUrl: portraitImage("col-shadow"),
    artworkCount: 12,
  },
];
