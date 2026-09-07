import { titleTokens } from "./cluster";

/**
 * Transparent, heuristic relevance scoring against the user's knowledge.
 *
 * This is a weighted keyword overlap plus a recency nudge. It is not a model
 * and it is not precise; the UI shows the breakdown so the number is always
 * explainable.
 */

export interface KnowledgeForRelevance {
  headline: string;
  expertise: string;
  audience: string;
  topics: string[];
}

export interface RelevanceReason {
  factor: "topics" | "expertise" | "headline" | "audience" | "recency";
  label: string;
  points: number;
  detail: string;
}

export interface RelevanceResult {
  score: number; // 0..100
  reasons: RelevanceReason[];
}

function tokenize(text: string): Set<string> {
  return titleTokens(text); // same stopword-filtered tokeniser
}

function overlapCount(a: Set<string>, b: Set<string>): string[] {
  const hits: string[] = [];
  for (const t of a) if (b.has(t)) hits.push(t);
  return hits.sort();
}

const WEIGHTS = {
  topics: 8, // points per matched topic word, capped
  expertise: 5,
  headline: 4,
  audience: 3,
  recency: 20, // full points for "today", decaying to 0 over ~21 days
} as const;

const CAPS = { topics: 40, expertise: 25, headline: 12, audience: 9 } as const;

export function scoreRelevance(
  text: { title: string; excerpt: string },
  knowledge: KnowledgeForRelevance,
  publishedAt?: Date,
  now: Date = new Date(),
): RelevanceResult {
  const content = tokenize(`${text.title} ${text.excerpt}`);
  const topicTokens = tokenize(knowledge.topics.join(" "));
  const expertiseTokens = tokenize(knowledge.expertise);
  const headlineTokens = tokenize(knowledge.headline);
  const audienceTokens = tokenize(knowledge.audience);

  const reasons: RelevanceReason[] = [];
  let score = 0;

  const addFactor = (
    factor: RelevanceReason["factor"],
    label: string,
    hits: string[],
    perHit: number,
    cap: number,
  ) => {
    if (hits.length === 0) return;
    const points = Math.min(cap, hits.length * perHit);
    score += points;
    reasons.push({
      factor,
      label,
      points,
      detail: `Matches ${hits.length === 1 ? "the word" : "words"}: ${hits.slice(0, 6).join(", ")}`,
    });
  };

  addFactor(
    "topics",
    "Overlaps your topics",
    overlapCount(content, topicTokens),
    WEIGHTS.topics,
    CAPS.topics,
  );
  addFactor(
    "expertise",
    "Overlaps your expertise",
    overlapCount(content, expertiseTokens),
    WEIGHTS.expertise,
    CAPS.expertise,
  );
  addFactor(
    "headline",
    "Overlaps your headline",
    overlapCount(content, headlineTokens),
    WEIGHTS.headline,
    CAPS.headline,
  );
  addFactor(
    "audience",
    "Relevant to your audience",
    overlapCount(content, audienceTokens),
    WEIGHTS.audience,
    CAPS.audience,
  );

  // Recency is a bonus on top of a real content match, never relevance on its
  // own — a fresh article about something you don't cover is not "relevant".
  if (score > 0 && publishedAt) {
    const ageDays = Math.max(0, (now.getTime() - publishedAt.getTime()) / 86_400_000);
    const recency = Math.round(Math.max(0, WEIGHTS.recency * (1 - ageDays / 21)));
    if (recency > 0) {
      score += recency;
      reasons.push({
        factor: "recency",
        label: "Recent",
        points: recency,
        detail: `Published ${ageDays < 1 ? "today" : `${Math.round(ageDays)} day(s) ago`}`,
      });
    }
  }

  return { score: Math.max(0, Math.min(100, Math.round(score))), reasons };
}
