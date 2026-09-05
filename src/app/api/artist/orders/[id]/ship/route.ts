import type { NextRequest } from "next/server";
import { getServerDb, setServerDb } from "@/lib/server/store";
import { getAuthUser, requireRole } from "@/lib/server/auth";
import { json, errorResponse } from "@/lib/server/respond";
import type { Shipment } from "@/types";

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const user = getAuthUser(request);
  const roleError = requireRole(user, ["artist"]);
  if (roleError) return errorResponse(roleError, user ? 403 : 401);

  const { id } = await params;
  const db = getServerDb();
  const order = db.orders.find((o) => o.id === id);
  if (!order) return errorResponse("Order not found", 404);
  const artwork = db.artworks.find((a) => a.id === order.artworkId);
  if (!artwork || artwork.artistId !== user!.artistId) {
    return errorResponse("This order does not belong to your artworks", 403);
  }

  const body = await request.json().catch(() => null);
  const carrier = typeof body?.carrier === "string" ? body.carrier.trim() : "";
  const trackingNumber = typeof body?.trackingNumber === "string" ? body.trackingNumber.trim() : "";
  if (!carrier || !trackingNumber) {
    return errorResponse("carrier and trackingNumber are required", 400);
  }

  const existing = db.shipments.find((s) => s.orderId === id);
  const shipment: Shipment = {
    id: existing?.id ?? `shipment-${crypto.randomUUID()}`,
    orderId: id,
    carrier,
    trackingNumber,
    status: "in_transit",
  };

  setServerDb({
    ...db,
    shipments: existing
      ? db.shipments.map((s) => (s.id === shipment.id ? shipment : s))
      : [...db.shipments, shipment],
    orders: db.orders.map((o) => (o.id === id ? { ...o, status: "shipped" } : o)),
  });

  return json(shipment);
}
