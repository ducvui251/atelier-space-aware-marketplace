import type { NextRequest } from "next/server";
import { getAuthUser } from "@/lib/server/auth";
import { json, errorResponse } from "@/lib/server/respond";
import { ServiceClientError } from "@/lib/gateway/http-client";
import { confirmCheckoutSession } from "@/lib/gateway/clients/commerce-checkout.client";

export async function POST(request: NextRequest) {
  const user = await getAuthUser(request);
  if (!user) return errorResponse("Unauthorized", 401);

  const body = await request.json().catch(() => null);
  const sessionId = typeof body?.sessionId === "string" ? body.sessionId : "";
  if (!sessionId) return errorResponse("sessionId is required", 400);

  try {
    return json(await confirmCheckoutSession(sessionId));
  } catch (error) {
    if (error instanceof ServiceClientError && error.status === 409) {
      return errorResponse("Stripe has not confirmed this payment yet", 409);
    }
    const message = error instanceof Error ? error.message : "Could not confirm checkout";
    return errorResponse(message, 503);
  }
}
