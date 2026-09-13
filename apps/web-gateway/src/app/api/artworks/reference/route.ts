import { NextRequest, NextResponse } from "next/server";
import { PublicDomainArtworkPageQuerySchema } from "@atelier/contracts";
import { ServiceClientError } from "@/lib/gateway/http-client";
import { listPublicDomainArtworks } from "@/lib/gateway/clients/artwork.client";

export const dynamic = "force-dynamic";

const SUCCESS_CACHE_CONTROL = "public, max-age=0, s-maxage=3600, stale-while-revalidate=86400";

export async function GET(request: NextRequest) {
  const query = PublicDomainArtworkPageQuerySchema.safeParse(Object.fromEntries(request.nextUrl.searchParams.entries()));
  if (!query.success) {
    return NextResponse.json(
      { error: "Invalid pagination parameters", code: "VALIDATION_ERROR" },
      { status: 400, headers: { "Cache-Control": "no-store" } },
    );
  }

  try {
    const page = await listPublicDomainArtworks(query.data);
    return NextResponse.json(page, { headers: { "Cache-Control": SUCCESS_CACHE_CONTROL } });
  } catch (error) {
    const correlationId = error instanceof ServiceClientError ? error.correlationId : crypto.randomUUID();
    const status = error instanceof ServiceClientError && [502, 503, 504].includes(error.status) ? error.status : 503;
    return NextResponse.json(
      { error: "The public-domain collection is temporarily unavailable", code: "UPSTREAM_UNAVAILABLE", correlationId },
      { status, headers: { "Cache-Control": "no-store" } },
    );
  }
}
