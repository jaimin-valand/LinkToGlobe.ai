import { randomBytes, scrypt as scryptCb, timingSafeEqual } from "node:crypto";
import { promisify } from "node:util";

const scrypt = promisify(scryptCb);
const KEYLEN = 64;

/**
 * Hash a password with scrypt (Node built-in — no native dependency).
 * Format: scrypt$<saltHex>$<hashHex>
 */
export async function hashPassword(password: string): Promise<string> {
  if (password.length < 8) {
    throw new Error("Password must be at least 8 characters");
  }
  const salt = randomBytes(16);
  const derived = (await scrypt(password, salt, KEYLEN)) as Buffer;
  return `scrypt$${salt.toString("hex")}$${derived.toString("hex")}`;
}

/** Constant-time verification of a password against a stored hash. */
export async function verifyPassword(password: string, stored: string): Promise<boolean> {
  const parts = stored.split("$");
  if (parts.length !== 3 || parts[0] !== "scrypt") return false;
  const salt = Buffer.from(parts[1], "hex");
  const expected = Buffer.from(parts[2], "hex");
  const derived = (await scrypt(password, salt, expected.length)) as Buffer;
  return expected.length === derived.length && timingSafeEqual(expected, derived);
}
