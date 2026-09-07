import type { AiProvider, AiResult } from "./types";

const disabled = <T>(): AiResult<T> => ({
  ok: false,
  error: "AI help is turned off. Set AI_PROVIDER=anthropic and AI_API_KEY to use it.",
});

/**
 * The default provider. Does nothing — the user writes everything themselves.
 * It never fabricates content; every method returns a disabled result.
 */
export const manualProvider: AiProvider = {
  id: "manual",
  enabled: false,
  async suggestIdeas() {
    return disabled<string[]>();
  },
  async suggestHook() {
    return disabled<string[]>();
  },
  async draftHooks() {
    return disabled<string[]>();
  },
  async expandDraft() {
    return disabled<string>();
  },
  async review() {
    return disabled();
  },
};
