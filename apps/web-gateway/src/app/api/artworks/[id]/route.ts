import type { NextRequest } from "next/server";
import { findArtwork } from "@/lib/gateway/clients/artwork.client";
import { json, errorResponse } from "@/lib/server/respond";

export async function GET(_request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const artwork = await findArtwork(id);
  if (!artwork) return errorResponse("Artwork not found", 404);
  return json(artwork);
}
