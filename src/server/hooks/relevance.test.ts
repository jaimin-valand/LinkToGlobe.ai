import { describe, it, expect } from "vitest";
import { scoreHookRelevance } from "./relevance";

const IDEA = "Rethinking on-call rotations for reliability after five years of incident data";
const TOPICS = ["on-call", "incident response", "reliability"];

describe("scoreHookRelevance", () => {
  it("scores a hook that reuses the idea's language higher than a generic one", () => {
    const on = scoreHookRelevance(
      "Five years of incident data changed how we design on-call rotations.",
      IDEA,
      TOPICS,
    );
    const generic = scoreHookRelevance(
      "Here is something I have been thinking about lately.",
      IDEA,
      TOPICS,
    );
    expect(on.score).toBeGreaterThan(generic.score);
    expect(on.overlap).toContain("incident");
    expect(on.overlap).toContain("rotations");
  });

  it("returns 0 for an empty hook", () => {
    expect(scoreHookRelevance("", IDEA, TOPICS)).toEqual({ score: 0, overlap: [] });
  });

  it("adds a bounded bonus for matching knowledge topics", () => {
    const withTopics = scoreHookRelevance(
      "Reliability is mostly an on-call problem.",
      IDEA,
      TOPICS,
    );
    const withoutTopics = scoreHookRelevance("Reliability is mostly an on-call problem.", IDEA, []);
    expect(withTopics.score).toBeGreaterThanOrEqual(withoutTopics.score);
  });

  it("stays within 0..100", () => {
    const r = scoreHookRelevance(IDEA, IDEA, TOPICS);
    expect(r.score).toBeGreaterThanOrEqual(0);
    expect(r.score).toBeLessThanOrEqual(100);
  });

  it("is deterministic and returns sorted, de-duplicated overlap", () => {
    const a = scoreHookRelevance("On-call, on-call, reliability and incident data.", IDEA, TOPICS);
    const b = scoreHookRelevance("On-call, on-call, reliability and incident data.", IDEA, TOPICS);
    expect(a).toEqual(b);
    expect(a.overlap).toEqual([...a.overlap].sort());
    expect(new Set(a.overlap).size).toBe(a.overlap.length);
  });
});
