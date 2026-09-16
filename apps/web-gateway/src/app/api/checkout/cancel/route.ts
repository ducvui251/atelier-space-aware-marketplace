import type { NextRequest } from "next/server";
import { getAuthUser } from "@/lib/server/auth";
import { json, errorResponse } from "@/lib/server/respond";
import { cancelCheckoutSession } from "@/lib/gateway/clients/commerce-checkout.client";

export async function POST(request: NextRequest) {
  const user = await getAuthUser(request);
  if (!user) return errorResponse("Unauthorized", 401);

  const body = await request.json().catch(() => null);
  const sessionId = typeof body?.sessionId === "string" ? body.sessionId : "";
  if (!sessionId) return errorResponse("sessionId is required", 400);

  try {
    return json(await cancelCheckoutSession(sessionId, user.id));
  } catch {
    return errorResponse("Could not cancel checkout", 503);
  }
}
