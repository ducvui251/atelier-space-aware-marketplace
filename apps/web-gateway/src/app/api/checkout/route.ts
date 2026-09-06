import type { NextRequest } from "next/server";
import { getAuthUser } from "@/lib/server/auth";
import { json, errorResponse } from "@/lib/server/respond";
import { CheckoutRequestSchema } from "@atelier/contracts";
import { checkout } from "@/lib/gateway/clients/commerce-checkout.client";

export async function POST(request: NextRequest) {
  const user = await getAuthUser(request);
  if (!user) return errorResponse("Unauthorized", 401);

  const body = await request.json().catch(() => null);
  const parsed = CheckoutRequestSchema.safeParse(body);
  if (!parsed.success) return errorResponse("shippingAddress.{fullName,address,city,phone} are required", 400);
  const { shippingAddress, method, simulateFailure } = parsed.data;

  if (simulateFailure) return errorResponse("Payment simulation is no longer supported", 400);
  try {
    return json(await checkout(user.id, { shippingAddress, method }, request.headers.get("idempotency-key") ?? crypto.randomUUID()), 201);
  } catch (error) {
    const message = error instanceof Error ? error.message : "Checkout failed";
    return errorResponse(message, message.includes("available") ? 409 : 503);
  }
}
