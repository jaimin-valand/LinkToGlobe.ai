import { describe, it, expect } from "vitest";
import { hashPassword, verifyPassword } from "./password";
import { createSessionToken, verifySessionToken } from "./session";

describe("password hashing", () => {
  it("round-trips a correct password and rejects a wrong one", async () => {
    const hash = await hashPassword("correct horse battery staple");
    expect(hash.startsWith("scrypt$")).toBe(true);
    expect(await verifyPassword("correct horse battery staple", hash)).toBe(true);
    expect(await verifyPassword("wrong password", hash)).toBe(false);
  });

  it("rejects short passwords", async () => {
    await expect(hashPassword("short")).rejects.toThrow();
  });

  it("does not store the plaintext", async () => {
    const hash = await hashPassword("super secret value");
    expect(hash).not.toContain("super secret value");
  });
});

describe("session tokens", () => {
  it("issues a token that verifies back to the same user id", () => {
    const token = createSessionToken("user_123");
    expect(verifySessionToken(token)).toBe("user_123");
  });

  it("rejects a tampered token", () => {
    const token = createSessionToken("user_123");
    const tampered = token.slice(0, -2) + (token.endsWith("aa") ? "bb" : "aa");
    expect(verifySessionToken(tampered)).toBeNull();
  });

  it("rejects an expired token", () => {
    const past = Date.now() - 40 * 24 * 60 * 60 * 1000;
    const token = createSessionToken("user_123", past);
    expect(verifySessionToken(token)).toBeNull();
  });

  it("rejects empty input", () => {
    expect(verifySessionToken(undefined)).toBeNull();
    expect(verifySessionToken("")).toBeNull();
    expect(verifySessionToken("garbage")).toBeNull();
  });
});
