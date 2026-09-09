import { createHmac, timingSafeEqual } from "node:crypto";

/**
 * Short-lived, HMAC-signed assertion of the caller's identity
 * (MICROSERVICE_100_PLAN.md Phase 4, G-19). The Gateway signs one right
 * after validating the caller's Supabase session and forwards it as the
 * `x-principal` header instead of a plain, forgeable `authUserId` query
 * param; the receiving service verifies the signature instead of trusting
 * the value at face value.
 *
 * Deliberately a separate secret from `ATELIER_INTERNAL_SERVICE_TOKEN`:
 * that token is held by all 8 services and only proves "this caller is
 * somewhere inside the internal network," not "this call is really on
 * behalf of this specific user." Scoping the signing secret to only the
 * services that actually need it (today: web-gateway signs,
 * account-service verifies) keeps the blast radius of a single compromised
 * service from including the ability to forge any user's identity.
 */
const PRINCIPAL_TTL_MS = 60_000;

function getSecret(): string {
  const secret = process.env.ATELIER_PRINCIPAL_SIGNING_SECRET;
  if (!secret) throw new Error("ATELIER_PRINCIPAL_SIGNING_SECRET is required to sign or verify a caller principal");
  return secret;
}

export function signPrincipal(userId: string): string {
  const expiresAt = Date.now() + PRINCIPAL_TTL_MS;
  const payload = `${userId}.${expiresAt}`;
  const signature = createHmac("sha256", getSecret()).update(payload).digest("hex");
  return `${payload}.${signature}`;
}

export function verifyPrincipal(token: string | null | undefined): string | null {
  if (!token) return null;
  const parts = token.split(".");
  if (parts.length !== 3) return null;
  const [userId, expiresAtRaw, signature] = parts;
  if (!userId || !expiresAtRaw || !signature) return null;
  const expiresAt = Number(expiresAtRaw);
  if (!Number.isFinite(expiresAt)) return null;

  let secret: string;
  try {
    secret = getSecret();
  } catch {
    return null;
  }

  const expected = createHmac("sha256", secret).update(`${userId}.${expiresAtRaw}`).digest("hex");
  const expectedBuf = Buffer.from(expected, "hex");
  const actualBuf = Buffer.from(signature, "hex");
  if (expectedBuf.length !== actualBuf.length || !timingSafeEqual(expectedBuf, actualBuf)) return null;
  if (Date.now() > expiresAt) return null;
  return userId;
}
