import type { NextRequest } from "next/server";
import { getServerDb, setServerDb } from "@/lib/server/store";
import { getAuthUser, publicUser } from "@/lib/server/auth";
import { json, errorResponse } from "@/lib/server/respond";

export async function GET(request: NextRequest) {
  const user = getAuthUser(request);
  if (!user) return errorResponse("Unauthorized", 401);

  const db = getServerDb();
  const artistProfile = user.artistId
    ? db.artists.find((a) => a.id === user.artistId) ?? null
    : null;

  return json({ user: publicUser(user), artistProfile });
}

export async function PATCH(request: NextRequest) {
  const user = getAuthUser(request);
  if (!user) return errorResponse("Unauthorized", 401);

  const body = await request.json().catch(() => null);
  const fullName = typeof body?.fullName === "string" ? body.fullName.trim() : "";
  if (!fullName) return errorResponse("fullName is required", 400);

  const db = getServerDb();
  const users = db.users.map((u) =>
    u.id === user.id ? { ...u, fullName, phone: body.phone ?? u.phone } : u,
  );
  const artists = user.artistId
    ? db.artists.map((a) =>
        a.id === user.artistId
          ? {
              ...a,
              displayName: fullName,
              bio: typeof body.bio === "string" ? body.bio : a.bio,
              portfolioUrl: typeof body.portfolioUrl === "string" ? body.portfolioUrl : a.portfolioUrl,
            }
          : a,
      )
    : db.artists;

  setServerDb({ ...db, users, artists });

  const updated = users.find((u) => u.id === user.id)!;
  const artistProfile = user.artistId ? artists.find((a) => a.id === user.artistId) ?? null : null;
  return json({ user: publicUser(updated), artistProfile });
}
