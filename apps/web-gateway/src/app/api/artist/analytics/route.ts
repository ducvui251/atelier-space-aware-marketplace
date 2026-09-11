import { randomUUID } from "node:crypto";
import type { NextRequest } from "next/server";
import type { ArtistAudience, ArtistEarnings, ArtworkSaveCount, ArtworkSaleCount } from "@atelier/contracts";
import { getAuthUser, requireRole } from "@/lib/server/auth";
import { json, errorResponse } from "@/lib/server/respond";
import { listArtistArtworks } from "@/lib/gateway/clients/artwork.client";
import { getArtistEarnings, getArtistTopArtworks } from "@/lib/gateway/clients/commerce.client";
import { getArtistAudience, getArtistSaves } from "@/lib/gateway/clients/recommendation.client";

const DEPENDENCY_TIMEOUT_MS = 3000;

interface Section<T> {
  data: T | null;
  unavailable: boolean;
}

function settled<T>(result: PromiseSettledResult<T>): Section<T> {
  return result.status === "fulfilled" ? { data: result.value, unavailable: false } : { data: null, unavailable: true };
}

/**
 * Artist-only analytics composition (§4.7 of the defect audit). Each
 * dependency gets its own 3-second timeout and can fail independently —
 * one slow/down service degrades its own section to "unavailable" rather
 * than failing the whole response, per §4.7's explicit requirement.
 *
 * Conversion (eligible orders / unique artwork detail views) is not
 * computed: there is no view-tracking instrumentation anywhere in this
 * system (see the Recommendation aggregates pass this same audit did —
 * views were deliberately deferred there, not an oversight here). Rather
 * than divide by an undefined denominator, this section is reported as
 * unavailable with an explicit reason instead of 0 or NaN.
 */
export async function GET(request: NextRequest) {
  const correlationId = randomUUID();
  const user = await getAuthUser(request);
  const roleError = requireRole(user, ["artist"]);
  if (roleError) return errorResponse(roleError, user ? 403 : 401);
  const artistId = user!.artistId;
  if (!artistId) return errorResponse("No artist profile for this account", 403);

  const { searchParams } = new URL(request.url);
  const period = (searchParams.get("period") ?? "day") as "day" | "week" | "month";
  const from = searchParams.get("from") ?? undefined;
  const to = searchParams.get("to") ?? undefined;
  const periodDays = period === "month" ? 30 : period === "week" ? 7 : 1;

  const [earningsResult, topArtworksResult, audienceResult, savesResult, artworksResult] = await Promise.allSettled([
    getArtistEarnings(artistId, { period, from, to }, DEPENDENCY_TIMEOUT_MS),
    getArtistTopArtworks(artistId, { from, to, limit: 5 }, DEPENDENCY_TIMEOUT_MS),
    getArtistAudience(artistId, periodDays, DEPENDENCY_TIMEOUT_MS),
    getArtistSaves(artistId, DEPENDENCY_TIMEOUT_MS),
    listArtistArtworks(artistId),
  ]);

  const earnings: Section<ArtistEarnings> = settled(earningsResult);
  const topArtworks: Section<{ items: ArtworkSaleCount[]; total: number }> = settled(topArtworksResult);
  const audience: Section<ArtistAudience> = settled(audienceResult);
  const saves: Section<{ items: ArtworkSaveCount[]; total: number }> = settled(savesResult);
  const artworksSection = settled(artworksResult);
  const artworks = artworksSection.data?.items ?? [];

  const savesByArtwork = new Map((saves.data?.items ?? []).map((s) => [s.artworkId, s.saves]));
  const salesByArtwork = new Map((topArtworks.data?.items ?? []).map((s) => [s.artworkId, s]));

  const artworkPerformance = artworksSection.unavailable
    ? null
    : artworks.map((artwork) => ({
        artworkId: artwork.id,
        title: artwork.title,
        imageUrl: artwork.imageUrl,
        availability: artwork.availability,
        verificationStatus: artwork.verificationStatus,
        saves: savesByArtwork.get(artwork.id) ?? 0,
        salesCount: salesByArtwork.get(artwork.id)?.salesCount ?? 0,
        revenue: salesByArtwork.get(artwork.id)?.revenue ?? 0,
      }));

  return json({
    artistId,
    period,
    correlationId,
    earnings,
    audience,
    artworkPerformance: { data: artworkPerformance, unavailable: artworksSection.unavailable },
    conversion: { data: null, unavailable: false, reason: "No view-tracking data source exists yet" },
  });
}
