import type { NextRequest } from "next/server";
import { getServerDb } from "@/lib/server/store";
import { json, errorResponse } from "@/lib/server/respond";

export async function GET(_request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const artist = getServerDb().artists.find((a) => a.id === id);
  if (!artist) return errorResponse("Artist not found", 404);
  return json(artist);
}
