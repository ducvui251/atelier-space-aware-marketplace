import type { NextRequest } from "next/server";
import { getServerDb, setServerDb } from "@/lib/server/store";
import { getAuthUser } from "@/lib/server/auth";
import { json, errorResponse } from "@/lib/server/respond";
import type { Complaint } from "@/types";

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const user = getAuthUser(request);
  if (!user) return errorResponse("Unauthorized", 401);

  const { id } = await params;
  const db = getServerDb();
  const order = db.orders.find((o) => o.id === id && o.buyerId === user.id);
  if (!order) return errorResponse("Order not found", 404);

  const body = await request.json().catch(() => null);
  const reason = typeof body?.reason === "string" ? body.reason.trim() : "";
  if (!reason) return errorResponse("reason is required", 400);

  const complaint: Complaint = {
    id: `complaint-${crypto.randomUUID()}`,
    orderId: id,
    reporterId: user.id,
    reason,
    status: "open",
  };
  setServerDb({ ...db, complaints: [...db.complaints, complaint] });
  return json(complaint, 201);
}
