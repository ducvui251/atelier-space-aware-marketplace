import type { NextRequest } from "next/server";
import { getAuthUser } from "@/lib/server/auth";
import { json, errorResponse } from "@/lib/server/respond";
import { removeCartItem } from "@/lib/gateway/clients/commerce.client";

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ artworkId: string }> },
) {
  const user = await getAuthUser(request);
  if (!user) return errorResponse("Unauthorized", 401);

  const { artworkId } = await params;
  return json(await removeCartItem(user.id, artworkId));
}
