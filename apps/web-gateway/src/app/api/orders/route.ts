import type { NextRequest } from "next/server";
import { getAuthUser } from "@/lib/server/auth";
import { json, errorResponse } from "@/lib/server/respond";
import { listOrders } from "@/lib/gateway/clients/orders.client";

export async function GET(request: NextRequest) {
  const user = await getAuthUser(request);
  if (!user) return errorResponse("Unauthorized", 401);

  return json(await listOrders(user.id));
}
