import type { NextRequest } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { requestService } from "@/lib/gateway/http-client";
import { json, errorResponse } from "@/lib/server/respond";
import { clientKey, rateLimit } from "@/lib/server/rate-limit";

const ROLE_VALUES = new Set(["buyer", "artist"]);

export async function POST(request: NextRequest) {
  const limit = rateLimit(clientKey(request, "signup"), 5, 60_000);
  if (!limit.ok) {
    return errorResponse("Too many signup attempts. Try again later.", 429);
  }

  const body = await request.json().catch(() => null);
  const email = typeof body?.email === "string" ? body.email.trim().toLowerCase() : "";
  const password = typeof body?.password === "string" ? body.password : "";
  const fullName = typeof body?.fullName === "string" ? body.fullName.trim() : "";
  const role = typeof body?.role === "string" && ROLE_VALUES.has(body.role) ? body.role : "buyer";

  if (!email || !password || !fullName) {
    return errorResponse("email, password and fullName are required", 400);
  }
  if (password.length < 8) {
    return errorResponse("Password must be at least 8 characters", 400);
  }

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

    // Sync the new identity into Account even while email confirmation is
    // pending — users/sync is idempotent by authUserId and login re-runs it.
    const profile = await requestService<{ user: Record<string, unknown> }>("account", "/v1/account/users/sync", {
      method: "POST",
      body: {
        authUserId: data.user.id,
        email: data.user.email,
        fullName,
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
