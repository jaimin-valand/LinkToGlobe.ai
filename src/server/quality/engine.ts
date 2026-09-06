/**
 * Deterministic quality checks. No AI, no network. Every result is reproducible
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

const PLACEHOLDER_PATTERNS: Array<[label: string, pattern: RegExp]> = [
  ["lorem ipsum", /lorem ipsum/i],
  ["TODO", /\bTODO\b/],
  ["TKTK", /\bTKTK\b/i],
  ["XXX", /\bXXX\b/],
  ["placeholder", /\bplaceholder\b/i],
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
    label: "Title length",
    status: titleLen === 0 ? "fail" : titleLen < 10 || titleLen > 120 ? "warn" : "pass",
    detail:
      titleLen === 0 ? "There is no title yet." : `${titleLen} characters. Aim for 10 to 120.`,
  });

  // Hook
  checks.push({
    id: "hook",
    label: "Opening hook",
    status: draft.hook.trim().length === 0 ? "warn" : "pass",
    detail:
      draft.hook.trim().length === 0
        ? "No hook set. The first line is what most people see."
        : "Set.",
  });

  // Body length
  checks.push({
    id: "body-length",
    label: "Body length",
    status: wordCount === 0 ? "fail" : wordCount < 60 ? "warn" : "pass",
    detail:
      wordCount === 0
        ? "The body is empty."
        : `${wordCount} words, about a ${readingTimeMinutes} minute read.`,
  });

  // Placeholders
  const placeholderHit = PLACEHOLDER_PATTERNS.find(([, p]) => p.test(body) || p.test(draft.title));
  checks.push({
    id: "placeholders",
    label: "No placeholder text",
    status: placeholderHit ? "fail" : "pass",
    detail: placeholderHit
      ? `Found leftover placeholder text ("${placeholderHit[0]}").`
      : "None found.",
  });

  // Unsupported claims
  const claimHit = CLAIM_PATTERNS.some((p) => p.test(body));
  const hasNotes = draft.sourceNotes.trim().length > 0;
  checks.push({
    id: "claims",
    label: "Claims have sources",
    status: claimHit && !hasNotes ? "warn" : "pass",
    detail:
      claimHit && !hasNotes
        ? "The body mentions figures or studies but source notes is empty. Add where they came from."
        : claimHit
          ? "Source notes provided."
          : "Nothing here that needs a citation.",
  });

  // Link attribution
  const urls = body.match(URL_PATTERN) ?? [];
  checks.push({
    id: "links",
    label: "Links",
    status: urls.length > 5 ? "warn" : "pass",
    detail:
      urls.length === 0
        ? "None."
        : `${urls.length} ${urls.length === 1 ? "link" : "links"} in the body.`,
  });

  // Tone: shouting
  const exclamations = (body.match(/!/g) ?? []).length;
  const allCapsWords = (body.match(/\b[A-Z]{4,}\b/g) ?? []).length;
  checks.push({
    id: "tone",
    label: "Tone",
    status: exclamations > 5 || allCapsWords > 4 ? "warn" : "pass",
    detail:
      exclamations > 5 || allCapsWords > 4
        ? `Reads as shouty: ${exclamations} exclamation marks, ${allCapsWords} words in capitals.`
        : "Reads fine.",
  });

  const weights: Record<CheckStatus, number> = { pass: 1, warn: 0.5, fail: 0 };
  const score = Math.round(
    (checks.reduce((sum, c) => sum + weights[c.status], 0) / checks.length) * 100,
  );
  const passed = checks.every((c) => c.status !== "fail");

  return { passed, score, checks, readingTimeMinutes, wordCount };
}
