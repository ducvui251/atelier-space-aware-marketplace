import type { NextRequest } from "next/server";
import { getServerDb } from "@/lib/server/store";
import { json, errorResponse } from "@/lib/server/respond";

export async function GET(_request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const artwork = getServerDb().artworks.find((a) => a.id === id);
  if (!artwork) return errorResponse("Artwork not found", 404);
  return json(artwork);
}
