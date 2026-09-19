import type { NextRequest } from "next/server";
import { getAuthUser } from "@/lib/server/auth";
import { json, errorResponse } from "@/lib/server/respond";
import { getShippingQuote } from "@/lib/gateway/clients/commerce-checkout.client";
import { ServiceClientError } from "@/lib/gateway/http-client";

export async function POST(request: NextRequest) {
  const user = await getAuthUser(request);
  if (!user) return errorResponse("Unauthorized", 401);

  const body = await request.json().catch(() => null);
  const artworkIds = Array.isArray(body?.artworkIds) ? body.artworkIds.filter((id: unknown) => typeof id === "string") : [];
  const buyerPostalCode = typeof body?.buyerPostalCode === "string" ? body.buyerPostalCode.trim() : "";
  const buyerCountry = typeof body?.buyerCountry === "string" ? body.buyerCountry.trim() : "";
  if (artworkIds.length === 0 || !buyerPostalCode || buyerCountry.length !== 2) return errorResponse("artworkIds, buyerPostalCode, and a 2-letter buyerCountry are required", 400);

  try {
    return json(await getShippingQuote(artworkIds, buyerPostalCode, buyerCountry));
  } catch (error) {
    if (error instanceof ServiceClientError && error.status < 500) return errorResponse(error.message, error.status);
    return errorResponse("Couldn't calculate shipping. Please try again.", 503);
  }
}
