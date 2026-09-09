import type { NextRequest } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { requestService } from "@/lib/gateway/http-client";
import { json, errorResponse } from "@/lib/server/respond";
import { clientKey, rateLimit } from "@/lib/server/rate-limit";
import { SignupRequestSchema, parseBody } from "@atelier/contracts";

export async function POST(request: NextRequest) {
  const limit = rateLimit(clientKey(request, "signup"), 5, 60_000);
  if (!limit.ok) {
    return errorResponse("Too many signup attempts. Try again later.", 429);
  }

  const body = await request.json().catch(() => null);
  const parsed = parseBody(SignupRequestSchema, {
    ...body,
    email: typeof body?.email === "string" ? body.email.trim().toLowerCase() : body?.email,
    fullName: typeof body?.fullName === "string" ? body.fullName.trim() : body?.fullName,
  });
  if (!parsed.success) return errorResponse(parsed.message, 400);
  const { email, password, fullName, role } = parsed.data;

  try {
    const supabase = await createClient();
    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: { full_name: fullName, role },
        emailRedirectTo: `${new URL(request.url).origin}/login`,
      },
    });
    if (error || !data.user) {
      return errorResponse(error?.message ?? "Could not create the account", 400);
    }

    // Sync the new identity (including role, which Account only honors on
    // first insert) even while email confirmation is pending. If this call
    // fails — e.g. Account or Artist & Artwork briefly unreachable — the
    // Supabase account still exists and syncAuthUser is idempotent, so the
    // next successful login retries it and self-heals (including the
    // artist_profiles row for an artist-role account).
    const profile = await requestService<{ user: Record<string, unknown> }>("account", "/v1/account/users/sync", {
      method: "POST",
      body: {
        authUserId: data.user.id,
        email: data.user.email,
        fullName,
        role,
      },
    }).catch(() => null);

    return json({
      user: profile?.user ?? null,
      requiresEmailConfirmation: !data.session,
    });
  } catch {
    return errorResponse("Authentication service unavailable", 503);
  }
}
