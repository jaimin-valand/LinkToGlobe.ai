/**
 * Freeze the deterministic judgement of one hook candidate: strategy, relevance
 * to the idea, clarity, and any warnings. Runs at insert time; the scores are
 * stored so a candidate always shows the same numbers. Differentiation is
 * computed separately (originality.ts) because it depends on the whole set.
 */

import type { HookEvaluation, HookContext, HookWarning } from "./types";
import { classifyStrategy } from "./strategies";
import { checkClarity } from "./readability";
import { scoreHookRelevance } from "./relevance";
import { wordCount, sentenceCount, figureTokens } from "./text";

export const MIN_HOOK_CHARS = 12;
export const MAX_HOOK_CHARS = 280;
const MAX_HOOK_WORDS = 32;
const MIN_HOOK_WORDS = 3;

const PLACEHOLDER_RE = /\b(lorem ipsum|todo|tktk|xxx|placeholder|your hook here)\b/i;

export function evaluateHook(text: string, ctx: HookContext): HookEvaluation {
  const trimmed = text.trim();
  const words = wordCount(trimmed);
  const clarity = checkClarity(trimmed);
  const relevance = scoreHookRelevance(trimmed, ctx.ideaText, ctx.topics);

  const warnings: HookWarning[] = [];

  const factFigures = new Set(figureTokens(ctx.factText));
  const unverified = figureTokens(trimmed).filter((f) => !factFigures.has(f));
  if (unverified.length > 0) {
    warnings.push({
      code: "unverified-figure",
      message: `Uses a figure that is not in your notes (${unverified.join(", ")}). Check it before you publish.`,
    });
  }

  if (words > MAX_HOOK_WORDS || trimmed.length > MAX_HOOK_CHARS) {
    warnings.push({ code: "too-long", message: "Long for an opening line. Tighten it." });
  }
  if (words < MIN_HOOK_WORDS) {
    warnings.push({
      code: "too-short",
      message: "Very short. It may not carry enough on its own.",
    });
  }
  if (sentenceCount(trimmed) > 2) {
    warnings.push({
      code: "multi-sentence",
      message: "More than two sentences. A hook usually lands harder as one.",
    });
  }
  if (PLACEHOLDER_RE.test(trimmed)) {
    warnings.push({ code: "placeholder", message: "Looks like placeholder text." });
  }

  return {
    strategy: classifyStrategy(trimmed),
    relevanceScore: relevance.score,
    relevanceOverlap: relevance.overlap,
    clarityScore: clarity.score,
    clarityGrade: clarity.grade,
    clarityNotes: clarity.notes,
    wordCount: words,
    warnings,
  };
}
