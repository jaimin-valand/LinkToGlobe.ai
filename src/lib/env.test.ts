import { describe, it, expect, beforeEach } from "vitest";
import {
  __resetEnvCache,
  clientEnvSchema,
  getClientEnv,
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
    expect(isPublicEnvKey("AUTH_SECRET")).toBe(false);
    expect(isPublicEnvKey("AI_API_KEY")).toBe(false);
  });
});

describe("client env schema", () => {
  it("contains no secret-looking keys", () => {
    const clientKeys = Object.keys(clientEnvSchema.shape);
    expect(clientKeys.every(isPublicEnvKey)).toBe(true);
    expect(clientKeys).not.toContain("DATABASE_URL");
    expect(clientKeys).not.toContain("AUTH_SECRET");
    expect(clientKeys).not.toContain("AI_API_KEY");
  });

  it("falls back to localhost when NEXT_PUBLIC_APP_URL is unset", () => {
    const prev = process.env.NEXT_PUBLIC_APP_URL;
    delete process.env.NEXT_PUBLIC_APP_URL;
    expect(getClientEnv().NEXT_PUBLIC_APP_URL).toBe("http://localhost:3000");
    process.env.NEXT_PUBLIC_APP_URL = prev;
  });
});

describe("server env schema", () => {
  it("rejects a non-postgres DATABASE_URL", () => {
    const result = serverEnvSchema.safeParse({
      NODE_ENV: "test",
      DATABASE_URL: "mysql://user:pass@localhost:3306/db",
      AUTH_SECRET: "0123456789abcdef0123",
    });
    expect(result.success).toBe(false);
  });

  it("requires DATABASE_URL and AUTH_SECRET", () => {
    expect(serverEnvSchema.safeParse({ NODE_ENV: "test" }).success).toBe(false);
  });

  it("accepts a valid postgres config", () => {
    const result = serverEnvSchema.safeParse({
      NODE_ENV: "test",
      DATABASE_URL: "postgresql://u:p@localhost:5432/db?schema=public",
      AUTH_SECRET: "0123456789abcdef0123",
    });
    expect(result.success).toBe(true);
  });

  it("defaults AI_PROVIDER to manual", () => {
    const result = serverEnvSchema.parse({
      DATABASE_URL: "postgresql://u:p@localhost:5432/db",
      AUTH_SECRET: "0123456789abcdef0123",
    });
    expect(result.AI_PROVIDER).toBe("manual");
  });
});
