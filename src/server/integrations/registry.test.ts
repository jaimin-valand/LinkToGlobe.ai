import { describe, it, expect, afterEach } from "vitest";
import { INTEGRATIONS, listIntegrations, getIntegration } from "./registry";

const snapshot = { ...process.env };
afterEach(() => {
  process.env = { ...snapshot };
});

describe("integration registry", () => {
  it("declares every future connection area", () => {
    const ids = INTEGRATIONS.map((i) => i.id);
    expect(ids).toEqual(
      expect.arrayContaining([
        "ai-anthropic",
        "ai-openai",
        "research",
        "linkedin",
        "email",
        "company-data",
        "calendar",
      ]),
    );
  });

  it("reports everything as not_configured when no integration env is set", () => {
    for (const key of [
      "AI_API_KEY",
      "OPENAI_API_KEY",
      "RESEARCH_PROVIDER",
      "RESEARCH_API_KEY",
      "LINKEDIN_CLIENT_ID",
      "LINKEDIN_CLIENT_SECRET",
      "EMAIL_PROVIDER",
      "COMPANY_DATA_API_KEY",
      "CALENDAR_PROVIDER",
    ]) {
      delete process.env[key];
    }
    for (const i of listIntegrations()) {
      expect(i.status).toBe("not_configured");
    }
  });

  it("marks an integration connected only when its env and selector are satisfied", () => {
    delete process.env.OPENAI_API_KEY;
    process.env.AI_PROVIDER = "openai";
    expect(getIntegration("ai-openai")?.status).toBe("not_configured");

    process.env.OPENAI_API_KEY = "test-key";
    expect(getIntegration("ai-openai")?.status).toBe("connected");

    // Wrong selector -> still not configured
    process.env.AI_PROVIDER = "manual";
    expect(getIntegration("ai-openai")?.status).toBe("not_configured");
  });

  it("lists the exact missing env vars", () => {
    delete process.env.LINKEDIN_CLIENT_ID;
    delete process.env.LINKEDIN_CLIENT_SECRET;
    expect(getIntegration("linkedin")?.missingEnv).toEqual([
      "LINKEDIN_CLIENT_ID",
      "LINKEDIN_CLIENT_SECRET",
    ]);
  });

  it("keeps unbuilt integrations flagged as boundary-only", () => {
    expect(getIntegration("linkedin")?.implemented).toBe(false);
    expect(getIntegration("ai-anthropic")?.implemented).toBe(true);
  });
});
