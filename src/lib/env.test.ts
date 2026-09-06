import { describe, it, expect, beforeEach } from "vitest";
import {
  __resetEnvCache,
  clientEnvSchema,
  getClientEnv,
  getServerEnv,
  isPublicEnvKey,
  serverEnvSchema,
} from "@/lib/env";

beforeEach(() => {
  __resetEnvCache();
});

describe("isPublicEnvKey", () => {
  it("only treats NEXT_PUBLIC_-prefixed keys as browser-safe", () => {
    expect(isPublicEnvKey("NEXT_PUBLIC_APP_URL")).toBe(true);
    expect(isPublicEnvKey("DATABASE_URL")).toBe(false);
    expect(isPublicEnvKey("AI_API_KEY")).toBe(false);
    expect(isPublicEnvKey("AUTH_SECRET")).toBe(false);
  });
});

describe("client env schema", () => {
  it("does not contain any secret-looking keys", () => {
    const clientKeys = Object.keys(clientEnvSchema.shape);
    expect(clientKeys.every(isPublicEnvKey)).toBe(true);
    expect(clientKeys).not.toContain("DATABASE_URL");
    expect(clientKeys).not.toContain("AI_API_KEY");
  });

  it("falls back to localhost when NEXT_PUBLIC_APP_URL is unset", () => {
    delete process.env.NEXT_PUBLIC_APP_URL;
    expect(getClientEnv().NEXT_PUBLIC_APP_URL).toBe("http://localhost:3000");
  });
});

describe("server env schema", () => {
  it("rejects a non-postgres DATABASE_URL", () => {
    const result = serverEnvSchema.safeParse({
      NODE_ENV: "test",
      DATABASE_URL: "mysql://user:pass@localhost:3306/db",
    });
    expect(result.success).toBe(false);
  });

  it("accepts config with no DATABASE_URL in Step 1", () => {
    const result = serverEnvSchema.safeParse({ NODE_ENV: "test" });
    expect(result.success).toBe(true);
  });

  it("parses the ambient test environment without throwing", () => {
    expect(() => getServerEnv()).not.toThrow();
  });
});
