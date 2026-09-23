import type { NextRequest } from "next/server";
import { getAdminArtworks } from "@/lib/gateway/clients/admin.client";
import { getAuthUser, requireRole } from "@/lib/server/auth";
import { json, errorResponse } from "@/lib/server/respond";

export async function GET(request: NextRequest) {
  const user = await getAuthUser(request);
  const roleError = requireRole(user, ["admin"]);
  if (roleError) return errorResponse(roleError, user ? 403 : 401);

  const params = request.nextUrl.searchParams;
  const status = params.get("status") ?? undefined;
  const q = params.get("q") ?? undefined;
  const page = Number(params.get("page") ?? "1") || 1;
  const limit = Number(params.get("limit") ?? "25") || 25;

  return json(await getAdminArtworks({ status, q, page, limit }));
}
