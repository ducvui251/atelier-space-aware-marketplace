import { randomUUID } from "node:crypto";
import type { NextRequest } from "next/server";
import { ArtistEarningsQuerySchema, type ArtistArtworkViews, type ArtistAudience, type ArtistEarnings, type ArtworkSaveCount, type ArtworkSaleCount } from "@atelier/contracts";
import { getAuthUser, requireRole } from "@/lib/server/auth";
import { json, errorResponse } from "@/lib/server/respond";
import { listArtistArtworks } from "@/lib/gateway/clients/artwork.client";
import { getArtistEarnings, getArtistTopArtworks } from "@/lib/gateway/clients/commerce.client";
import { getArtistAudience, getArtistSaves, getArtistViews } from "@/lib/gateway/clients/recommendation.client";

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
 * Artwork views are privacy-preserving Recommendation aggregates. Conversion
 * is eligible orders (processing, shipped or completed) divided by unique
 * artwork-viewer-UTC-day records over the same 90-day window. A zero-view
 * window has no rate rather than a misleading 0% or NaN.
 */
export async function GET(request: NextRequest) {
  const correlationId = randomUUID();
  const user = await getAuthUser(request);
  const roleError = requireRole(user, ["artist"]);
  if (roleError) return errorResponse(roleError, user ? 403 : 401);
  const artistId = user!.artistId;
  if (!artistId) return errorResponse("No artist profile for this account", 403);

  const { searchParams } = new URL(request.url);
  const parsedQuery = ArtistEarningsQuerySchema.safeParse(Object.fromEntries(searchParams.entries()));
  if (!parsedQuery.success) return errorResponse("Invalid analytics period or date range", 400);
  const period = parsedQuery.data.period;
  const to = parsedQuery.data.to ?? new Date().toISOString().slice(0, 10);
  const from = parsedQuery.data.from ?? (() => {
    const date = new Date(`${to}T00:00:00.000Z`);
    date.setUTCDate(date.getUTCDate() - 89);
    return date.toISOString().slice(0, 10);
  })();
  if (from > to) return errorResponse("Analytics from date must be on or before to date", 400);
  const periodDays = period === "month" ? 30 : period === "week" ? 7 : 1;

  const [earningsResult, topArtworksResult, audienceResult, savesResult, viewsResult, artworksResult] = await Promise.allSettled([
    getArtistEarnings(artistId, { period, from, to }, DEPENDENCY_TIMEOUT_MS, correlationId),
    getArtistTopArtworks(artistId, { from, to, limit: 5 }, DEPENDENCY_TIMEOUT_MS, correlationId),
    getArtistAudience(artistId, periodDays, DEPENDENCY_TIMEOUT_MS, correlationId),
    getArtistSaves(artistId, DEPENDENCY_TIMEOUT_MS, correlationId),
    getArtistViews(artistId, { from, to }, DEPENDENCY_TIMEOUT_MS, correlationId),
    listArtistArtworks(artistId, { timeoutMs: DEPENDENCY_TIMEOUT_MS, correlationId }),
  ]);

  const earnings: Section<ArtistEarnings> = settled(earningsResult);
  const topArtworks: Section<{ items: ArtworkSaleCount[]; total: number }> = settled(topArtworksResult);
  const audience: Section<ArtistAudience> = settled(audienceResult);
  const saves: Section<{ items: ArtworkSaveCount[]; total: number }> = settled(savesResult);
  const views: Section<ArtistArtworkViews> = settled(viewsResult);
  const artworksSection = settled(artworksResult);
  const artworks = artworksSection.data?.items ?? [];

  const savesByArtwork = new Map((saves.data?.items ?? []).map((s) => [s.artworkId, s.saves]));
  const salesByArtwork = new Map((topArtworks.data?.items ?? []).map((s) => [s.artworkId, s]));
  const viewsByArtwork = new Map((views.data?.items ?? []).map((view) => [view.artworkId, view.views]));

  const artworkPerformance = artworksSection.unavailable
    ? null
    : artworks.map((artwork) => ({
        artworkId: artwork.id,
        title: artwork.title,
        imageUrl: artwork.imageUrl,
        availability: artwork.availability,
        verificationStatus: artwork.verificationStatus,
        saves: savesByArtwork.get(artwork.id) ?? 0,
        views: views.data ? viewsByArtwork.get(artwork.id) ?? 0 : null,
        salesCount: salesByArtwork.get(artwork.id)?.salesCount ?? 0,
        revenue: salesByArtwork.get(artwork.id)?.revenue ?? 0,
      }));

  const conversionUnavailable = views.unavailable || earnings.unavailable || !views.data || !earnings.data;
  const eligibleOrders = earnings.data
    ? earnings.data.orderCounts.processing + earnings.data.orderCounts.shipped + earnings.data.orderCounts.completed
    : null;
  const conversion = {
    data: conversionUnavailable || eligibleOrders === null ? null : {
      eligibleOrders,
      views: views.data!.totalViews,
      rate: views.data!.totalViews === 0 ? null : eligibleOrders / views.data!.totalViews,
    },
    unavailable: conversionUnavailable,
    reason: views.unavailable || !views.data ? "View tracking is unavailable" : earnings.unavailable || !earnings.data ? "Order data is unavailable" : null,
  };

  return json({
    artistId,
    period,
    from,
    to,
    correlationId,
    earnings,
    audience,
    views,
    artworkPerformance: { data: artworkPerformance, unavailable: artworksSection.unavailable },
    conversion,
  });
}
