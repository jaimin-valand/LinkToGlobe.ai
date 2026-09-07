import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import { __resetEnvCache } from "@/lib/env";
import {
  getResearchProvider,
  researchConfigState,
  requireResearchProvider,
  __resetResearchProviderCache,
} from "./provider";
import { NotConfiguredError } from "./types";

function reset() {
  __resetEnvCache();
  __resetResearchProviderCache();
}

beforeEach(reset);
afterEach(() => {
  vi.unstubAllEnvs();
  reset();
});

describe("research provider configuration", () => {
  it("is not configured when the env vars are missing", () => {
    vi.stubEnv("RESEARCH_PROVIDER", "");
    vi.stubEnv("RESEARCH_API_KEY", "");
    reset();

    expect(getResearchProvider()).toBeNull();
    const state = researchConfigState();
    expect(state.configured).toBe(false);
    expect(state.missingEnv).toEqual(["RESEARCH_PROVIDER", "RESEARCH_API_KEY"]);
    expect(() => requireResearchProvider()).toThrow(NotConfiguredError);
  });

  it("flags an unknown provider name", () => {
    vi.stubEnv("RESEARCH_PROVIDER", "some-unknown-service");
    vi.stubEnv("RESEARCH_API_KEY", "key");
    reset();

    expect(getResearchProvider()).toBeNull();
    const state = researchConfigState();
    expect(state.configured).toBe(false);
    expect(state.unknownProvider).toBe(true);
  });

  it("returns a Tavily provider when configured", () => {
    vi.stubEnv("RESEARCH_PROVIDER", "tavily");
    vi.stubEnv("RESEARCH_API_KEY", "tvly-abc");
    reset();

    expect(getResearchProvider()?.id).toBe("tavily");
    expect(researchConfigState().configured).toBe(true);
  });

  it("requires RESEARCH_GOOGLE_CX for the google provider", () => {
    vi.stubEnv("RESEARCH_PROVIDER", "google");
    vi.stubEnv("RESEARCH_API_KEY", "gkey");
    vi.stubEnv("RESEARCH_GOOGLE_CX", "");
    reset();
    expect(getResearchProvider()).toBeNull();
    expect(researchConfigState().missingEnv).toContain("RESEARCH_GOOGLE_CX");

    vi.stubEnv("RESEARCH_GOOGLE_CX", "cx-123");
    reset();
    expect(getResearchProvider()?.id).toBe("google");
    expect(researchConfigState().configured).toBe(true);
  });

  it("allows the fixture provider outside production and marks it as such", () => {
    vi.stubEnv("NODE_ENV", "test");
    vi.stubEnv("RESEARCH_PROVIDER", "fixture");
    vi.stubEnv("RESEARCH_API_KEY", "");
    reset();

    expect(getResearchProvider()?.id).toBe("fixture");
    const state = researchConfigState();
    expect(state.configured).toBe(true);
    expect(state.fixture).toBe(true);
  });

  it("refuses the fixture provider in production", () => {
    vi.stubEnv("NODE_ENV", "production");
    vi.stubEnv("RESEARCH_PROVIDER", "fixture");
    vi.stubEnv("RESEARCH_API_KEY", "");
    reset();

    expect(getResearchProvider()).toBeNull();
    expect(researchConfigState().configured).toBe(false);
  });
});
