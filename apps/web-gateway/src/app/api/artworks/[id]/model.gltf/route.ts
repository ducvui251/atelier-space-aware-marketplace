import type { NextRequest } from "next/server";
import { findArtwork } from "@/lib/gateway/clients/artwork.client";
import { buildArtworkQuadGltf } from "@/lib/ar/artwork-quad-gltf";

export async function GET(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const artwork = await findArtwork(id);
  // Same visibility rule as /api/artworks/[id]: only a verified artwork's
  // AR model is servable, and a 404 here doesn't distinguish "not found"
  // from "not verified" for the same reason the JSON route doesn't.
  if (!artwork || artwork.verificationStatus !== "verified") {
    return new Response("Artwork not found", { status: 404 });
  }

  const imageUrl = new URL(artwork.imageUrl, request.url).toString();
  const gltf = buildArtworkQuadGltf({
    widthCm: artwork.widthCm,
    heightCm: artwork.heightCm,
    imageUrl,
    title: artwork.title,
  });

  return new Response(JSON.stringify(gltf), {
    headers: {
      "content-type": "model/gltf+json",
      // Artwork dimensions/images don't change often enough to justify
      // regenerating this on every AR open; a day is a safe, short cache.
      "cache-control": "public, max-age=86400",
    },
  });
}
