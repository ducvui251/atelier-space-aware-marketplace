import type { NextRequest } from "next/server";
import { getServerDb } from "@/lib/gateway/runtime";
import { getAuthUser, requireRole } from "@/lib/server/auth";
import { json, errorResponse } from "@/lib/server/respond";

export async function GET(request: NextRequest) {
  const user = getAuthUser(request);
  const roleError = requireRole(user, ["admin"]);
  if (roleError) return errorResponse(roleError, user ? 403 : 401);

  const db = getServerDb();
  return json({
    pendingArtists: db.artists.filter((a) => a.verificationStatus === "pending").length,
    pendingArtworks: db.artworks.filter((a) => a.verificationStatus === "pending").length,
    openComplaints: db.complaints.filter((c) => c.status === "open").length,
    totalOrders: db.orders.length,
    revenue: db.orders
      .filter((o) => o.status !== "cancelled")
      .reduce((sum, o) => sum + o.totalAmount, 0),
  });
}
