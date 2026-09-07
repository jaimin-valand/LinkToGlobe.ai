/**
 * How closely a hook line ties back to the idea it is for. Deterministic:
 * content-word overlap with the idea text and its topics, plus a small penalty
 * when the hook is so generic it shares almost nothing.
 */

import { contentTokens, tokenSet } from "./text";

export interface HookRelevance {
  score: number; // 0-100
  overlap: string[]; // idea words the hook picks up
}

export function scoreHookRelevance(
  hook: string,
  ideaText: string,
  topics: string[] = [],
): HookRelevance {
  const hookTokens = tokenSet(hook);
  if (hookTokens.size === 0) return { score: 0, overlap: [] };

  const ideaTokens = new Set(contentTokens(ideaText));
  const topicTokens = new Set(topics.flatMap((t) => contentTokens(t)));

  const overlap: string[] = [];
  let hits = 0;
  let topicHits = 0;
  for (const w of hookTokens) {
    if (ideaTokens.has(w)) {
      hits++;
      overlap.push(w);
    }
    if (topicTokens.has(w)) topicHits++;
  }

  // Share of the hook's own words that connect to the idea, plus a topic bonus.
  const connectedShare = hits / hookTokens.size;
  const raw = connectedShare * 82 + Math.min(topicHits, 3) * 6;
  const score = Math.max(0, Math.min(100, Math.round(raw)));

  return { score, overlap: Array.from(new Set(overlap)).sort() };
}
