import type { RoomPreset } from "@atelier/contracts";
import { artworkImage } from "./images";

export const rooms: RoomPreset[] = [
  { id: "room-living", name: "Living Room", imageUrl: artworkImage("room-living", 1400, 900) },
  { id: "room-bedroom", name: "Bedroom", imageUrl: artworkImage("room-bedroom", 1400, 900) },
  { id: "room-dining", name: "Dining", imageUrl: artworkImage("room-dining", 1400, 900) },
  { id: "room-office", name: "Study", imageUrl: artworkImage("room-office", 1400, 900) },
  { id: "room-hallway", name: "Hallway", imageUrl: artworkImage("room-hallway", 1400, 900) },
];
