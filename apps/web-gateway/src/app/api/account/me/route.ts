import type { NextRequest } from "next/server";
import { requestService } from "@/lib/gateway/http-client";
import { getAuthUser, publicUser } from "@/lib/server/auth";
import { findArtist } from "@/lib/gateway/clients/artwork.client";
import { json, errorResponse } from "@/lib/server/respond";
import { signPrincipal } from "@atelier/config/principal";

// authUserId travels as a signed x-principal header, not a query param
// (G-19) — account-service verifies the signature instead of trusting a
// caller-supplied value at face value.
function principalHeaders(request: NextRequest, userId: string): Record<string, string> {
  return {
    "x-principal": signPrincipal(userId),
    ...(request.headers.get("authorization") ? { authorization: request.headers.get("authorization")! } : {}),
  };
}

export async function GET(request: NextRequest) {
  const user = await getAuthUser(request);
  if (!user) return errorResponse("Unauthorized", 401);

  const profile = await requestService<{ user: typeof user }>("account", "/v1/account/me", {
    headers: principalHeaders(request, user.id),
  });
  const artistProfile = profile.user.artistId ? await findArtist(profile.user.artistId) : null;
  return json({ user: publicUser(profile.user), artistProfile });
}

export async function PATCH(request: NextRequest) {
  const user = await getAuthUser(request);
  if (!user) return errorResponse("Unauthorized", 401);

  const body = await request.json().catch(() => null);
  const fullName = typeof body?.fullName === "string" ? body.fullName.trim() : "";
  if (!fullName) return errorResponse("fullName is required", 400);

  const profile = await requestService<{ user: typeof user }>("account", "/v1/account/me", {
    method: "PATCH",
    body: { fullName, phone: body.phone },
    headers: principalHeaders(request, user.id),
  });
  const artistProfile = profile.user.artistId ? await findArtist(profile.user.artistId) : null;
  return json({ user: publicUser(profile.user), artistProfile });
}
