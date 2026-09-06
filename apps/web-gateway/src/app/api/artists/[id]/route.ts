import type { NextRequest } from "next/server";
import { findArtist } from "@/lib/gateway/clients/artwork.client";
import { json, errorResponse } from "@/lib/server/respond";

export async function GET(_request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const artist = await findArtist(id);
  if (!artist) return errorResponse("Artist not found", 404);
  return json(artist);
}
