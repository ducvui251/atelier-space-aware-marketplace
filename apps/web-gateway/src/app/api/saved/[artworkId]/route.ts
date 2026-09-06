import type { NextRequest } from "next/server";
import { getAuthUser } from "@/lib/server/auth";
import { json, errorResponse } from "@/lib/server/respond";
import { toggleNetworkSaved } from "@/lib/gateway/clients/recommendation.client";

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ artworkId: string }> },
) {
  const user = await getAuthUser(request);
  if (!user) return errorResponse("Unauthorized", 401);

  const { artworkId } = await params;
  try { return json(await toggleNetworkSaved(user.id, artworkId)); }
  catch { return errorResponse("Artwork could not be saved", 409); }
}
