import { createHash, randomUUID } from "node:crypto";
import type { NextRequest } from "next/server";
import { ArtworkViewRequestSchema } from "@atelier/contracts";
import { findArtwork } from "@/lib/gateway/clients/artwork.client";
import { recordArtworkView } from "@/lib/gateway/clients/recommendation.client";
import { ServiceClientError } from "@/lib/gateway/http-client";
import { json, errorResponse } from "@/lib/server/respond";
import { createClient } from "@/lib/supabase/server";

const VISITOR_COOKIE = "atelier_viewer_id";
const DEPENDENCY_TIMEOUT_MS = 3000;

export async function POST(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  if (!ArtworkViewRequestSchema.shape.artworkId.safeParse(id).success) {
    return errorResponse("Invalid artwork id", 400);
  }

  const correlationId = randomUUID();
  try {
    const artwork = await findArtwork(id, { timeoutMs: DEPENDENCY_TIMEOUT_MS, correlationId });
    if (!artwork || artwork.verificationStatus !== "verified") return errorResponse("Artwork not found", 404);

    let authUserId: string | null = null;
    if (process.env.NEXT_PUBLIC_SUPABASE_URL && (process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY)) {
      try {
        const supabase = await createClient();
        const { data, error } = await supabase.auth.getUser();
        if (!error) authUserId = data.user?.id ?? null;
      } catch {
        // Public artwork browsing remains available when optional auth config is absent.
      }
    }

    const existingVisitorId = request.cookies.get(VISITOR_COOKIE)?.value;
    const parsedVisitorId = ArtworkViewRequestSchema.shape.artworkId.safeParse(existingVisitorId);
    const visitorId = parsedVisitorId.success ? parsedVisitorId.data : randomUUID();
    const viewedOn = new Date().toISOString().slice(0, 10);
    const identity = authUserId ? `user:${authUserId}` : `visitor:${visitorId}`;
    const viewerHash = createHash("sha256").update(`${identity}:${viewedOn}`).digest("hex");
    const view = ArtworkViewRequestSchema.safeParse({ artworkId: id, viewedOn, viewerHash });
    if (!view.success) return errorResponse("Invalid artwork view", 400);

    const result = await recordArtworkView(view.data, DEPENDENCY_TIMEOUT_MS, correlationId);
    const response = json({ ...result, correlationId });
    if (!authUserId && !parsedVisitorId.success) {
      response.cookies.set(VISITOR_COOKIE, visitorId, {
        httpOnly: true,
        secure: process.env.NODE_ENV === "production",
        sameSite: "lax",
        maxAge: 60 * 60 * 24 * 365,
        path: "/",
      });
    }
    return response;
  } catch (error) {
    const status = error instanceof ServiceClientError && error.status === 404 ? 404 : 503;
    return errorResponse(status === 404 ? "Artwork not found" : "Artwork view tracking is unavailable", status);
  }
}
