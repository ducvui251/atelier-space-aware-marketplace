import type { NextRequest } from "next/server";
import { getArtistById } from "@atelier/artist-artwork-service";
import { getServerDb } from "@/lib/gateway/runtime";
import { json, errorResponse } from "@/lib/server/respond";

export async function GET(_request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const artist = getArtistById(getServerDb().artists, id);
  if (!artist) return errorResponse("Artist not found", 404);
  return json(artist);
}
