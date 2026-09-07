import type { NextRequest } from "next/server";
import { saveReview } from "@/lib/gateway/clients/orders.client";
import { getAuthUser } from "@/lib/server/auth";
import { json, errorResponse } from "@/lib/server/respond";

export async function POST(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const user = await getAuthUser(request);
  if (!user) return errorResponse("Unauthorized", 401);
  const body = await request.json().catch(() => null);
  const rating = Number(body?.rating);
  if (!(rating >= 1 && rating <= 5)) return errorResponse("rating must be 1-5", 400);
  const { id } = await params;
  try { return json(await saveReview(id, user.id, { rating, comment: typeof body?.comment === "string" ? body.comment : undefined })); }
  catch { return errorResponse("Review could not be saved", 409); }
}
