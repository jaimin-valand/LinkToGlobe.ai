import { createHmac, timingSafeEqual } from "node:crypto";
import { getServerEnv } from "@/lib/env";
import { SESSION_TTL_SECONDS } from "./cookie";

/**
 * Stateless signed-cookie sessions.
 *
 * Token = base64url(JSON payload) + "." + base64url(HMAC-SHA256(payload, AUTH_SECRET)).
 * No session table: revocation is by short TTL + secret rotation. Good enough
 * for a single-tenant MVP; a DB session store can replace this later without
 * touching callers.
 */

export { SESSION_COOKIE, SESSION_TTL_SECONDS } from "./cookie";

interface SessionPayload {
  userId: string;
  exp: number; // unix seconds
}

function b64url(input: Buffer | string): string {
  return Buffer.from(input).toString("base64url");
}

function sign(payloadB64: string): string {
  return createHmac("sha256", getServerEnv().AUTH_SECRET).update(payloadB64).digest("base64url");
}

export function createSessionToken(userId: string, now = Date.now()): string {
  const payload: SessionPayload = {
    userId,
    exp: Math.floor(now / 1000) + SESSION_TTL_SECONDS,
  };
  const payloadB64 = b64url(JSON.stringify(payload));
  return `${payloadB64}.${sign(payloadB64)}`;
}

export function verifySessionToken(
  token: string | undefined | null,
  now = Date.now(),
): string | null {
  if (!token) return null;
  const [payloadB64, sig] = token.split(".");
  if (!payloadB64 || !sig) return null;

  const expected = sign(payloadB64);
  const a = Buffer.from(sig);
  const b = Buffer.from(expected);
  if (a.length !== b.length || !timingSafeEqual(a, b)) return null;

  try {
    const payload = JSON.parse(Buffer.from(payloadB64, "base64url").toString()) as SessionPayload;
    if (typeof payload.userId !== "string" || typeof payload.exp !== "number") return null;
    if (payload.exp * 1000 < now) return null;
    return payload.userId;
  } catch {
    return null;
  }
}
