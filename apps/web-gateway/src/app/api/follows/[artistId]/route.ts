import type { NextRequest } from "next/server";
import { getAuthUser } from "@/lib/server/auth";
import { json, errorResponse } from "@/lib/server/respond";
import { toggleNetworkFollow } from "@/lib/gateway/clients/recommendation.client";

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ artistId: string }> },
) {
  const user = await getAuthUser(request);
  if (!user) return errorResponse("Unauthorized", 401);

  const { artistId } = await params;
  try { return json(await toggleNetworkFollow(user.id, artistId)); }
  catch { return errorResponse("Artist could not be followed", 409); }
}
