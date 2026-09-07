import type { EvidenceKind, SignalKind } from "@/generated/prisma";
import type { RelevanceReason } from "./relevance";

/**
 * A content opportunity is a *view* over a signal plus the user's knowledge.
 * It is computed, not stored. When the user acts on it, an `Idea` row is
 * persisted (see src/server/research/service.ts -> saveSignalAsIdea).
 */

export interface OpportunitySignal {
  id: string;
  kind: SignalKind;
  evidenceKind: EvidenceKind;
  summary: string;
  detail: string;
  relevanceScore: number | null;
  relevanceReasons: RelevanceReason[] | null;
  clusterTitle: string | null;
  sources: { id: string; title: string; url: string; publisher: string | null }[];
}

export interface ContentOpportunity {
  signalId: string;
  topic: string;
  whyItMatters: string;
  userRelevance: string;
  suggestedAngle: string;
  confidence: number; // 0..100, heuristic
  isInference: boolean;
  sources: OpportunitySignal["sources"];
  nextAction: string;
}

const ANGLE_BY_KIND: Record<SignalKind, (topic: string) => string> = {
  RISING: (t) =>
    `A grounded take on why "${t}" is getting attention now, and what it means for your audience.`,
  RECURRING: (t) =>
    `Name the pattern behind "${t}" that several outlets circle but none states plainly.`,
  UNUSUAL: (t) =>
    `Why the outlier view on "${t}" deserves more attention, from your vantage point.`,
  CHANGE: (t) => `A short, first-hand read on what just changed with "${t}" and why it matters.`,
  GAP: (t) => `Write about ${t} from your own experience; the current coverage is not covering it.`,
};

/** For a GAP signal, pull the "missing" terms back out of the summary. */
function gapTopic(summary: string): string {
  const m = /doesn't touch:\s*(.+?)\.?$/i.exec(summary);
  return (m?.[1] ?? summary).trim();
}

export function toOpportunity(signal: OpportunitySignal): ContentOpportunity {
  const topic =
    signal.kind === "GAP"
      ? gapTopic(signal.summary).slice(0, 160)
      : (signal.clusterTitle ?? signal.summary).replace(/^["']|["']$/g, "").slice(0, 160);
  const rel = signal.relevanceScore ?? 0;

  const userRelevance =
    signal.relevanceReasons && signal.relevanceReasons.length > 0
      ? signal.relevanceReasons.map((r) => `${r.label} (+${r.points})`).join("; ")
      : "No direct overlap with your knowledge was detected; treat this as general.";

  // Confidence: relevance carries most of it; direct evidence and having real
  // sources add a little. Purely heuristic, shown as such in the UI.
  const confidence = Math.max(
    5,
    Math.min(
      95,
      Math.round(
        rel * 0.7 +
          (signal.evidenceKind === "DIRECT" ? 15 : 0) +
          Math.min(15, signal.sources.length * 5),
      ),
    ),
  );

  return {
    signalId: signal.id,
    topic,
    whyItMatters: signal.detail || signal.summary,
    userRelevance,
    suggestedAngle: ANGLE_BY_KIND[signal.kind](topic),
    confidence,
    isInference: signal.evidenceKind === "INFERENCE",
    sources: signal.sources,
    nextAction:
      signal.sources.length > 0
        ? "Save as an idea, then read the linked sources before drafting."
        : "Save as an idea. This one is an inference, so bring your own evidence.",
  };
}
