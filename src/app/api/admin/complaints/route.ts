import type { NextRequest } from "next/server";
import { getServerDb } from "@/lib/server/store";
import { getAuthUser, requireRole } from "@/lib/server/auth";
import { json, errorResponse } from "@/lib/server/respond";

export async function GET(request: NextRequest) {
  const user = getAuthUser(request);
  const roleError = requireRole(user, ["admin"]);
  if (roleError) return errorResponse(roleError, user ? 403 : 401);

  const db = getServerDb();
  const items = [...db.complaints].sort((a, b) => {
    if (a.status === b.status) return 0;
    return a.status === "open" ? -1 : 1;
  });
  return json({ items, total: items.length });
}
