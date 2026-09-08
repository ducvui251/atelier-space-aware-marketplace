import type { NextRequest } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { requestService } from "@/lib/gateway/http-client";
import { json, errorResponse } from "@/lib/server/respond";
import { clientKey, rateLimit } from "@/lib/server/rate-limit";

export async function POST(request: NextRequest) {
  const limit = rateLimit(clientKey(request, "login"), 10, 60_000);
  if (!limit.ok) {
    return errorResponse("Too many login attempts. Try again later.", 429);
  }

  const body = await request.json().catch(() => null);
  const email = typeof body?.email === "string" ? body.email.trim().toLowerCase() : "";
  const password = typeof body?.password === "string" ? body.password : "";
  if (!email || !password) {
    return errorResponse("email and password are required", 400);
  }

  try {
    const supabase = await createClient();
    const { data, error } = await supabase.auth.signInWithPassword({ email, password });
    if (error || !data.user || !data.session) return errorResponse("Invalid email or password", 401);

    const profile = await requestService<{ user: Record<string, unknown> }>("account", "/v1/account/users/sync", {
      method: "POST",
      body: {
        authUserId: data.user.id,
        email: data.user.email,
        fullName: (data.user.user_metadata?.full_name as string | undefined) ?? email,
        phone: data.user.phone,
      },
      headers: { authorization: `Bearer ${data.session.access_token}` },
    });
    return json({ token: data.session.access_token, user: profile.user });
  } catch {
    return errorResponse("Authentication service unavailable", 503);
  }
}
