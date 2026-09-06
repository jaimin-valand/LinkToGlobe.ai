import "server-only";
import { getServerEnv } from "@/lib/env";
import { createAnthropicProvider } from "./anthropic";
import { manualProvider } from "./manual";
import type { AiProvider } from "./types";

export type * from "./types";

let cached: AiProvider | null = null;

/** The AI provider selected by AI_PROVIDER. Defaults to the no-op manual provider. */
export function getAi(): AiProvider {
  if (cached) return cached;
  const env = getServerEnv();
  if (env.AI_PROVIDER === "anthropic" && env.AI_API_KEY) {
    cached = createAnthropicProvider({ apiKey: env.AI_API_KEY, model: env.AI_MODEL });
  } else {
    cached = manualProvider;
  }
  return cached;
}
