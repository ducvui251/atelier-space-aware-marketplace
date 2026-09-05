import type { NextRequest } from "next/server";
import { getServerDb } from "@/lib/server/store";
import { json } from "@/lib/server/respond";

export async function GET(request: NextRequest) {
  const db = getServerDb();
  const { searchParams } = new URL(request.url);
  let items = db.artworks;

  const q = searchParams.get("q");
  if (q) {
    const needle = q.toLowerCase();
    items = items.filter((a) =>
      [a.title, a.artist, a.medium, ...a.style, ...a.dominantColors]
        .join(" ")
        .toLowerCase()
        .includes(needle),
    );
  }

  const style = searchParams.get("style");
  if (style) items = items.filter((a) => a.style.includes(style));

  const color = searchParams.get("color");
  if (color) items = items.filter((a) => a.dominantColors.includes(color));

  const orientation = searchParams.get("orientation");
  if (orientation) items = items.filter((a) => a.orientation === orientation);

  const edition = searchParams.get("edition");
  if (edition) items = items.filter((a) => a.editionType === edition);

  const availability = searchParams.get("availability");
  if (availability) items = items.filter((a) => a.availability === availability);

  const minPrice = searchParams.get("minPrice");
  if (minPrice) items = items.filter((a) => a.price >= Number(minPrice));

  const maxPrice = searchParams.get("maxPrice");
  if (maxPrice) items = items.filter((a) => a.price <= Number(maxPrice));

  return json({ items, total: items.length });
}
