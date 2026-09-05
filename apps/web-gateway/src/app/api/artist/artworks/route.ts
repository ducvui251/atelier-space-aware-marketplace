import type { NextRequest } from "next/server";
import { getServerDb, setServerDb } from "@/lib/gateway/runtime";
import { getAuthUser, requireRole } from "@/lib/server/auth";
import { json, errorResponse } from "@/lib/server/respond";
import type { Artwork } from "@/types";

export async function GET(request: NextRequest) {
  const user = getAuthUser(request);
  const roleError = requireRole(user, ["artist"]);
  if (roleError) return errorResponse(roleError, user ? 403 : 401);

  const db = getServerDb();
  const items = db.artworks.filter((a) => a.artistId === user!.artistId);
  return json({ items, total: items.length });
}

export async function POST(request: NextRequest) {
  const user = getAuthUser(request);
  const roleError = requireRole(user, ["artist"]);
  if (roleError) return errorResponse(roleError, user ? 403 : 401);

  const db = getServerDb();
  const artist = db.artists.find((a) => a.id === user!.artistId);
  if (!artist) return errorResponse("Artist profile not found", 404);

  const body = await request.json().catch(() => null);
  const required = ["title", "medium", "imageUrl"];
  for (const field of required) {
    if (typeof body?.[field] !== "string" || !body[field].trim()) {
      return errorResponse(`${field} is required`, 400);
    }
  }
  if (!(Number(body?.price) > 0)) return errorResponse("price must be > 0", 400);
  if (!(Number(body?.widthCm) > 0) || !(Number(body?.heightCm) > 0)) {
    return errorResponse("widthCm and heightCm must be > 0", 400);
  }

  const artwork: Artwork = {
    id: `aw-${crypto.randomUUID()}`,
    artistId: artist.id,
    artist: artist.displayName,
    title: body.title.trim(),
    medium: body.medium.trim(),
    widthCm: Number(body.widthCm),
    heightCm: Number(body.heightCm),
    price: Number(body.price),
    currency: typeof body.currency === "string" && body.currency ? body.currency : "USD",
    dominantColors: Array.isArray(body.dominantColors) ? body.dominantColors : [],
    style: Array.isArray(body.style) ? body.style : [],
    editionType: body.editionType === "limited-edition" ? "limited-edition" : "original",
    availability: "available",
    verificationStatus: "pending",
    imageUrl: body.imageUrl.trim(),
    orientation: ["portrait", "landscape", "square"].includes(body.orientation)
      ? body.orientation
      : "portrait",
    year: Number(body.year) || new Date().getFullYear(),
    description: typeof body.description === "string" ? body.description : undefined,
    coaUrl: typeof body.coaUrl === "string" ? body.coaUrl : undefined,
  };

  setServerDb({ ...db, artworks: [...db.artworks, artwork] });
  return json(artwork, 201);
}
