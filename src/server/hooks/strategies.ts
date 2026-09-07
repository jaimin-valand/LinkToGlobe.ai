/**
 * Hook strategies and a deterministic classifier.
 *
 * The classifier looks at the surface shape of a line (punctuation, opening
 * words, a few marker phrases) and picks the closest strategy. It does not
 * "understand" the hook. Same input, same output.
 */

import type { HookStrategy } from "@/generated/prisma";

export interface StrategyDef {
  id: HookStrategy;
  label: string;
  description: string;
  /** One line of guidance handed to the AI provider. */
  guidance: string;
}

export const HOOK_STRATEGIES: StrategyDef[] = [
  {
    id: "QUESTION",
    label: "Question",
    description: "Opens with a pointed question the reader wants answered.",
    guidance: "a pointed question the target reader would want answered",
  },
  {
    id: "CONTRARIAN",
    label: "Contrarian",
    description: "Challenges a common assumption in the field.",
    guidance: "a contrarian line that challenges a common assumption",
  },
  {
    id: "STORY",
    label: "Story",
    description: "Starts mid-scene or in the first person.",
    guidance: "a first-person or mid-scene opening drawn only from the notes",
  },
  {
    id: "STAT",
    label: "Number",
    description: "Leads with a concrete figure. Only use a figure that is in the notes.",
    guidance: "a line built around a figure that appears in the notes (never invent one)",
  },
  {
    id: "HOWTO",
    label: "How-to",
    description: "Promises a method or a set of steps.",
    guidance: "a 'how to' or 'the playbook for' framing",
  },
  {
    id: "DIRECT",
    label: "Direct",
    description: "States the takeaway plainly.",
    guidance: "a plain, direct statement of the main takeaway",
  },
];

const STRATEGY_BY_ID: Record<HookStrategy, StrategyDef> = Object.fromEntries(
  HOOK_STRATEGIES.map((s) => [s.id, s]),
) as Record<HookStrategy, StrategyDef>;

export function strategyDef(id: HookStrategy): StrategyDef {
  return STRATEGY_BY_ID[id];
}

const HOWTO_RE =
  /^(how to\b|how i\b|the (playbook|guide|steps|recipe) (for|to)\b|steps to\b|a guide to\b)|\bhere'?s how\b/i;
const CONTRARIAN_RE =
  /\b(myth|misconception|counterintuitive|contrary to|unpopular opinion|everyone (thinks|says|believes)|conventional wisdom|isn'?t|aren'?t|won'?t|doesn'?t|stop\b|nobody tells you|not actually|wrong about)\b/i;
const STORY_RE =
  /^(last (week|month|year|night)|a (year|month|week|few years) ago|years ago|when i (was|first|joined|started)|i (once|used to|remember|spent)|it was\b|picture this|the day (i|we)\b|my first\b)/i;

/** Pick the strategy that best fits a line's shape. Deterministic. */
export function classifyStrategy(text: string): HookStrategy {
  const t = text.trim();
  if (!t) return "DIRECT";
  if (t.endsWith("?")) return "QUESTION";
  if (STORY_RE.test(t)) return "STORY";
  if (HOWTO_RE.test(t)) return "HOWTO";
  if (CONTRARIAN_RE.test(t)) return "CONTRARIAN";
  if (/\d/.test(t)) return "STAT";
  return "DIRECT";
}
