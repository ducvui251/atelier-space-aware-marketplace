import type { NextRequest } from "next/server";
import { getAuthUser } from "@/lib/server/auth";
import { getNetworkSaved } from "@/lib/gateway/clients/recommendation.client";
import { json, errorResponse } from "@/lib/server/respond";

export async function GET(request: NextRequest) {
  const user = await getAuthUser(request);
  if (!user) return errorResponse("Unauthorized", 401);

  return json(await getNetworkSaved(user.id));
}
