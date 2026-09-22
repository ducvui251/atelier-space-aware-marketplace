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

  // Not request.url: Next.js's NextRequest.url doesn't reflect the actual
  // incoming Host header in this setup (confirmed live — curling this route
  // with `Host: 192.168.0.104:3000` still got back request.url on
  // localhost:3000), so a root-relative artwork.imageUrl resolved against
  // it silently pointed AR sessions at the phone's own "localhost" instead
  // of this server. The raw Host header is what actually carries the
  // origin the client connected to.
  const host = request.headers.get("host") ?? new URL(request.url).host;
  const protocol = request.headers.get("x-forwarded-proto") ?? "http";
  const imageUrl = new URL(artwork.imageUrl, `${protocol}://${host}`).toString();
  const gltf = buildArtworkQuadGltf({
    widthCm: artwork.widthCm,
    heightCm: artwork.heightCm,
    imageUrl,
    title: artwork.title,
  });

  return new Response(JSON.stringify(gltf), {
    headers: {
      "content-type": "model/gltf+json",
      // Deliberately no caching. A prior day-long max-age here caused a
      // real, confirmed bug: a phone that had scanned an artwork's AR QR
      // before the Host-header fix above kept serving its own cached (and
      // broken — texture pointed at "localhost", i.e. the phone itself)
      // response for up to 24h after the server was fixed, since nothing
      // about this URL changes to bust that cache. The quad is cheap to
      // regenerate on every request, so correctness wins over the caching.
      "cache-control": "no-store",
    },
  });
}
