import type { NextRequest } from "next/server";
import { getArtworkById } from "@atelier/artist-artwork-service";
import { getServerDb } from "@/lib/gateway/runtime";
import { json, errorResponse } from "@/lib/server/respond";

export async function GET(_request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const artwork = getArtworkById(getServerDb().artworks, id);
  if (!artwork) return errorResponse("Artwork not found", 404);
  return json(artwork);
}
