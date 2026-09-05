import type { NextRequest } from "next/server";
import type { MockUser, UserRole } from "@/types";
import { getServerDb } from "./store";

/**
 * Deliberately trivial "auth": the bearer token is just the user id,
 * base64url-encoded. There is no signing, expiry, or secret — this is a demo
 * API for exercising the mock business logic, not a real auth system.
 */
export function createToken(userId: string): string {
  return Buffer.from(userId, "utf-8").toString("base64url");
}

export function verifyToken(token: string): MockUser | null {
  try {
    const userId = Buffer.from(token, "base64url").toString("utf-8");
    return getServerDb().users.find((u) => u.id === userId) ?? null;
  } catch {
    return null;
  }
}

export function getAuthUser(request: NextRequest | Request): MockUser | null {
  const header = request.headers.get("authorization") ?? "";
  const match = header.match(/^Bearer\s+(.+)$/i);
  if (!match) return null;
  return verifyToken(match[1]);
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
