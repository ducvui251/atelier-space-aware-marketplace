import type { NextRequest } from "next/server";
import { getNetworkRecommendations } from "@/lib/gateway/clients/recommendation.client";
import { getAuthUser } from "@/lib/server/auth";
import { json } from "@/lib/server/respond";

export async function GET(request: NextRequest) {
  const user = await getAuthUser(request);
  const buyerId = user?.id ?? null;
  const result = await getNetworkRecommendations(buyerId);
  return json(result);
}
