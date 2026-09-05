import type { NextRequest } from "next/server";
import { getServerDb } from "@/lib/gateway/runtime";
import { getGatewayRecommendations } from "@/lib/gateway/clients/recommendation.client";
import { getAuthUser } from "@/lib/server/auth";
import { json } from "@/lib/server/respond";

export async function GET(request: NextRequest) {
  const db = getServerDb();
  const user = getAuthUser(request);
  const buyerId = user?.id ?? null;
  const result = getGatewayRecommendations(db, buyerId);
  return json(result);
}
