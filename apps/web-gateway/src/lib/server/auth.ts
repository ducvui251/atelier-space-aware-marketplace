import type { NextRequest } from "next/server";
import type { MockUser, UserRole } from "@/types";
import { createClient } from "@/lib/supabase/server";
import { requestService } from "@/lib/gateway/http-client";

function bearerToken(request: NextRequest | Request): string | null {
  const header = request.headers.get("authorization") ?? "";
  const match = header.match(/^Bearer\s+(.+)$/i);
  return match?.[1] ?? null;
}

export async function getAuthUser(request: NextRequest | Request): Promise<MockUser | null> {
  try {
    const supabase = await createClient();
    const token = bearerToken(request);
    const result = token ? await supabase.auth.getUser(token) : await supabase.auth.getUser();
    if (result.error || !result.data.user?.id || !result.data.user.email) return null;
    const authUser = result.data.user;
    const profile = await requestService<{ user: Omit<MockUser, "password"> }>("account", "/v1/account/users/sync", {
      method: "POST",
      body: {
        authUserId: authUser.id,
        email: authUser.email,
        fullName: (authUser.user_metadata?.full_name as string | undefined) ?? authUser.email,
        phone: authUser.phone,
      },
      headers: { ...(token ? { authorization: `Bearer ${token}` } : {}) },
    });
    return { ...profile.user, password: "" };
  } catch {
    return null;
  }
}

export function requireRole(user: MockUser | null, roles: UserRole[]): string | null {
  if (!user) return "Unauthorized: missing or invalid bearer token";
  if (!roles.includes(user.role)) return `Forbidden: requires role ${roles.join(" or ")}`;
  return null;
}

export function publicUser(user: MockUser): Omit<MockUser, "password"> {
  return {
    id: user.id,
    fullName: user.fullName,
    email: user.email,
    phone: user.phone,
    role: user.role,
    createdAt: user.createdAt,
    artistId: user.artistId,
  };
}
