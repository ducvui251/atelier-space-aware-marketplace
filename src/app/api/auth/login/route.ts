import type { NextRequest } from "next/server";
import { getServerDb } from "@/lib/server/store";
import { createToken, publicUser } from "@/lib/server/auth";
import { json, errorResponse } from "@/lib/server/respond";

export async function POST(request: NextRequest) {
  const body = await request.json().catch(() => null);
  const email = typeof body?.email === "string" ? body.email.trim().toLowerCase() : "";
  const password = typeof body?.password === "string" ? body.password : "";
  if (!email || !password) {
    return errorResponse("email and password are required", 400);
  }

  const db = getServerDb();
  const user = db.users.find((u) => u.email.toLowerCase() === email);
  if (!user || user.password !== password) {
    return errorResponse("Invalid email or password", 401);
  }

  return json({ token: createToken(user.id), user: publicUser(user) });
}
