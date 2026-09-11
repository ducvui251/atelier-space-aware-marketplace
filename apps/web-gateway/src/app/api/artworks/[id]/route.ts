import type { NextRequest } from "next/server";
import { findArtwork } from "@/lib/gateway/clients/artwork.client";
import { json, errorResponse } from "@/lib/server/respond";

export async function GET(_request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const artwork = await findArtwork(id);
  // Public detail is verified-only, same rule as the public listing (the
  // artist's own view of a pending/rejected artwork goes through
  // /api/artist/artworks/[id] instead, which is ownership-checked and must
  // see every status). Responding 404 rather than 403 avoids revealing that
  // a pending/rejected artwork with this id exists at all.
  if (!artwork || artwork.verificationStatus !== "verified") return errorResponse("Artwork not found", 404);
  return json(artwork);
}
