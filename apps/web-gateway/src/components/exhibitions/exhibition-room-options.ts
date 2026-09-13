import type { ExhibitionRoomTemplateId } from "@atelier/contracts";

interface ExhibitionRoomOption {
  id: ExhibitionRoomTemplateId;
  name: string;
  description: string;
  swatches: readonly [string, string, string];
}

export const EXHIBITION_ROOM_OPTIONS = [
  {
    id: "white-cube",
    name: "White Cube",
    description: "Clean white walls with a pale stone floor.",
    swatches: ["bg-stone-50", "bg-stone-200", "bg-stone-300"],
  },
  {
    id: "warm-gallery",
    name: "Warm Gallery",
    description: "Soft plaster walls and a warm oak floor.",
    swatches: ["bg-amber-100", "bg-amber-800", "bg-orange-50"],
  },
  {
    id: "black-box",
    name: "Black Box",
    description: "Charcoal walls, dark flooring, and gallery track lights.",
    swatches: ["bg-zinc-800", "bg-zinc-950", "bg-zinc-700"],
  },
] satisfies readonly ExhibitionRoomOption[];

export function getExhibitionRoomName(templateId: string) {
  return EXHIBITION_ROOM_OPTIONS.find((option) => option.id === templateId)?.name ?? "White Cube";
}
