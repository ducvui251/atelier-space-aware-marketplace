import type { NextRequest } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { requestService } from "@/lib/gateway/http-client";
import { json, errorResponse } from "@/lib/server/respond";

export async function POST(request: NextRequest) {
  const body = await request.json().catch(() => null);
  const email = typeof body?.email === "string" ? body.email.trim().toLowerCase() : "";
  const password = typeof body?.password === "string" ? body.password : "";
  const fullName = typeof body?.fullName === "string" ? body.fullName.trim() : "";
  if (!email || !password) {
    return errorResponse("email and password are required", 400);
  }
  if (password.length < 6) {
    return errorResponse("Password must be at least 6 characters", 400);
  }

  try {
    const supabase = await createClient();
    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: fullName ? { data: { full_name: fullName } } : undefined,
    });
    if (error) {
      const message = /already registered|already exists/i.test(error.message)
        ? "An account with this email already exists"
        : error.message;
      return errorResponse(message, 400);
    }
    if (!data.user) return errorResponse("Registration failed", 400);

    // Email confirmation is disabled for this project (see runbooks), so
    // signUp returns an active session immediately — sync + log the new
    // user in the same way POST /api/auth/login does. If confirmation were
    // ever re-enabled, data.session would be null here and this falls back
    // to telling the user to check their email instead of a hard error.
    if (!data.session) {
      return json({ requiresEmailConfirmation: true, message: "Check your email to confirm your account before signing in." }, 200);
    }

    const profile = await requestService<{ user: Record<string, unknown> }>("account", "/v1/account/users/sync", {
      method: "POST",
      body: {
        authUserId: data.user.id,
        email: data.user.email,
        fullName: fullName || data.user.email,
        phone: data.user.phone,
      },
      headers: { authorization: `Bearer ${data.session.access_token}` },
    });
    return json({ token: data.session.access_token, user: profile.user }, 201);
  } catch {
    return errorResponse("Authentication service unavailable", 503);
  }
}
