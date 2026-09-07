import { getServerEnv } from "@/lib/env";
import { createTavilyProvider } from "./providers/tavily";
import { createGoogleProvider } from "./providers/google";
import { createFixtureProvider } from "./providers/fixture";
import { NotConfiguredError, type ResearchProvider } from "./types";

/** Provider ids this build can talk to. `fixture` is dev/test only. */
export const SUPPORTED_RESEARCH_PROVIDERS = ["tavily", "google"] as const;

/** True in non-production, where the deterministic fixture provider is allowed. */
function fixtureAllowed(nodeEnv: string): boolean {
  return nodeEnv !== "production";
}

let cached: ResearchProvider | null | undefined;

/**
 * The configured research provider, or `null` when research is not set up.
 * Callers must handle `null` and show the "not configured" state — never a
 * fabricated result.
 */
export function getResearchProvider(): ResearchProvider | null {
  if (cached !== undefined) return cached;
  const env = getServerEnv();
  const name = (env.RESEARCH_PROVIDER ?? "").trim().toLowerCase();
  const key = (env.RESEARCH_API_KEY ?? "").trim();
  const googleCx = (env.RESEARCH_GOOGLE_CX ?? "").trim();

  if (name === "fixture" && fixtureAllowed(env.NODE_ENV)) {
    cached = createFixtureProvider();
    return cached;
  }
  if (name === "tavily" && key) {
    cached = createTavilyProvider(key);
    return cached;
  }
  if (name === "google" && key && googleCx) {
    cached = createGoogleProvider({ apiKey: key, cx: googleCx });
    return cached;
  }
  // Not configured, or configured for a provider this build cannot use.
  cached = null;
  return cached;
}

/** Throwing variant for the service layer. */
export function requireResearchProvider(): ResearchProvider {
  const p = getResearchProvider();
  if (!p) throw new NotConfiguredError();
  return p;
}

export interface ResearchConfigState {
  configured: boolean;
  provider: string | null;
  /** True when RESEARCH_PROVIDER names something this build cannot use. */
  unknownProvider: boolean;
  /** True when the deterministic dev/test fixture provider is active. */
  fixture: boolean;
  missingEnv: string[];
}

/** Configuration status for the UI. Reads env only. */
export function researchConfigState(): ResearchConfigState {
  const env = getServerEnv();
  const name = (env.RESEARCH_PROVIDER ?? "").trim().toLowerCase();
  const key = (env.RESEARCH_API_KEY ?? "").trim();
  const googleCx = (env.RESEARCH_GOOGLE_CX ?? "").trim();

  if (name === "fixture" && fixtureAllowed(env.NODE_ENV)) {
    return {
      configured: true,
      provider: "fixture",
      unknownProvider: false,
      fixture: true,
      missingEnv: [],
    };
  }

  const known = name === "" || (SUPPORTED_RESEARCH_PROVIDERS as readonly string[]).includes(name);
  const missingEnv: string[] = [];
  if (!name) missingEnv.push("RESEARCH_PROVIDER");
  if (known && !key) missingEnv.push("RESEARCH_API_KEY");
  if (name === "google" && !googleCx) missingEnv.push("RESEARCH_GOOGLE_CX");

  return {
    configured: known && !!name && missingEnv.length === 0,
    provider: name || null,
    unknownProvider: !known,
    fixture: false,
    missingEnv,
  };
}

/** Test seam. */
export function __resetResearchProviderCache(): void {
  cached = undefined;
}
