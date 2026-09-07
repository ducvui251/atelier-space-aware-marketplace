import type { NextRequest } from "next/server";
import { confirmReceived } from "@/lib/gateway/clients/orders.client";
import { getAuthUser } from "@/lib/server/auth";
import { json, errorResponse } from "@/lib/server/respond";

export async function POST(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const user = await getAuthUser(request);
  if (!user) return errorResponse("Unauthorized", 401);
  const { id } = await params;
  try { return json(await confirmReceived(id, user.id)); }
  catch { return errorResponse("Order cannot be confirmed", 409); }
}
