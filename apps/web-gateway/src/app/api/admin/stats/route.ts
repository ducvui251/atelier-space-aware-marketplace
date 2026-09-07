import type { NextRequest } from "next/server";
import { getAdminStats } from "@/lib/gateway/clients/admin.client";
import { getAuthUser, requireRole } from "@/lib/server/auth";
import { json, errorResponse } from "@/lib/server/respond";

export async function GET(request: NextRequest) {
  const user = await getAuthUser(request);
  const roleError = requireRole(user, ["admin"]);
  if (roleError) return errorResponse(roleError, user ? 403 : 401);
  return json(await getAdminStats());
}
