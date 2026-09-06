/**
 * Deterministic quality checks. No AI, no network — every result is reproducible
 * from the draft text alone. AI-assisted review is separate and advisory
 * (src/server/ai). A draft must pass this engine to leave QUALITY_CHECK.
 */

export type CheckStatus = "pass" | "warn" | "fail";

export interface QualityCheck {
  id: string;
  label: string;
  status: CheckStatus;
  detail: string;
}

export interface QualityResult {
  passed: boolean;
  score: number; // 0-100
  checks: QualityCheck[];
  readingTimeMinutes: number;
  wordCount: number;
}

export interface DraftInput {
  title: string;
  hook: string;
  body: string;
  sourceNotes: string;
}

const PLACEHOLDER_PATTERNS = [
  /lorem ipsum/i,
  /\bTODO\b/,
  /\bTKTK\b/i,
  /\bXXX\b/,
  /\bplaceholder\b/i,
];
const CLAIM_PATTERNS = [
  /\d+\s?%/,
  /\bstudy shows\b/i,
  /\bresearch shows\b/i,
  /\bproven\b/i,
  /\bstatistics?\b/i,
];
const URL_PATTERN = /https?:\/\/[^\s)]+/g;

function words(text: string): number {
  return text.trim() ? text.trim().split(/\s+/).length : 0;
}

export function runQualityChecks(draft: DraftInput): QualityResult {
  const checks: QualityCheck[] = [];
  const body = draft.body.trim();
  const wordCount = words(body);
  const readingTimeMinutes = Math.max(1, Math.round(wordCount / 200));

  // Title
  const titleLen = draft.title.trim().length;
  checks.push({
    id: "title",
    label: "Title present and reasonable length",
    status: titleLen === 0 ? "fail" : titleLen < 10 || titleLen > 120 ? "warn" : "pass",
    detail:
      titleLen === 0
        ? "The draft has no title."
        : `Title is ${titleLen} characters (aim for 10–120).`,
  });

  // Hook
  checks.push({
    id: "hook",
    label: "Opening hook written",
    status: draft.hook.trim().length === 0 ? "warn" : "pass",
    detail:
      draft.hook.trim().length === 0
        ? "No hook set — the first line is what most readers see."
        : "Hook is set.",
  });

  // Body length
  checks.push({
    id: "body-length",
    label: "Body has enough substance",
    status: wordCount === 0 ? "fail" : wordCount < 60 ? "warn" : "pass",
    detail:
      wordCount === 0
        ? "The body is empty."
        : `Body is ${wordCount} words (${readingTimeMinutes} min read).`,
  });

  // Placeholders
  const placeholderHit = PLACEHOLDER_PATTERNS.find((p) => p.test(body) || p.test(draft.title));
  checks.push({
    id: "placeholders",
    label: "No placeholder text left in",
    status: placeholderHit ? "fail" : "pass",
    detail: placeholderHit ? `Found leftover placeholder text (${placeholderHit}).` : "Clean.",
  });

  // Unsupported claims
  const claimHit = CLAIM_PATTERNS.some((p) => p.test(body));
  const hasNotes = draft.sourceNotes.trim().length > 0;
  checks.push({
    id: "claims",
    label: "Data-like claims are backed by source notes",
    status: claimHit && !hasNotes ? "warn" : "pass",
    detail:
      claimHit && !hasNotes
        ? "The body cites figures or studies but Source notes is empty. Add attribution."
        : claimHit
          ? "Claims present and source notes provided."
          : "No unsupported-looking claims detected.",
  });

  // Link attribution
  const urls = body.match(URL_PATTERN) ?? [];
  checks.push({
    id: "links",
    label: "Links look intentional",
    status: urls.length > 5 ? "warn" : "pass",
    detail: urls.length === 0 ? "No links." : `${urls.length} link(s) in the body.`,
  });

  // Tone: shouting
  const exclamations = (body.match(/!/g) ?? []).length;
  const allCapsWords = (body.match(/\b[A-Z]{4,}\b/g) ?? []).length;
  checks.push({
    id: "tone",
    label: "Tone is measured",
    status: exclamations > 5 || allCapsWords > 4 ? "warn" : "pass",
    detail:
      exclamations > 5 || allCapsWords > 4
        ? `Reads as shouty (${exclamations} "!", ${allCapsWords} ALL-CAPS words).`
        : "Fine.",
  });

  const weights: Record<CheckStatus, number> = { pass: 1, warn: 0.5, fail: 0 };
  const score = Math.round(
    (checks.reduce((sum, c) => sum + weights[c.status], 0) / checks.length) * 100,
  );
  const passed = checks.every((c) => c.status !== "fail");

  return { passed, score, checks, readingTimeMinutes, wordCount };
}
