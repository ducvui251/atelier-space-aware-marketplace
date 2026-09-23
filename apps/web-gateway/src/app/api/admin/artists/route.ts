import type { NextRequest } from "next/server";
import { getAdminArtists } from "@/lib/gateway/clients/admin.client";
import { getAuthUser, requireRole } from "@/lib/server/auth";
import { json, errorResponse } from "@/lib/server/respond";

export async function GET(request: NextRequest) {
  const user = await getAuthUser(request);
  const roleError = requireRole(user, ["admin"]);
  if (roleError) return errorResponse(roleError, user ? 403 : 401);

  const status = request.nextUrl.searchParams.get("status") ?? undefined;

  return json(await getAdminArtists({ status }));
}
