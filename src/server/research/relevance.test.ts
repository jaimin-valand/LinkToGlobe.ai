import { describe, it, expect } from "vitest";
import { scoreRelevance, type KnowledgeForRelevance } from "./relevance";

const knowledge: KnowledgeForRelevance = {
  headline: "Staff SRE focused on incident response",
  expertise: "on-call design, reliability, postmortems, alerting",
  audience: "engineering leaders",
  topics: ["incident response", "on-call", "reliability"],
};

const NOW = new Date("2026-09-07T00:00:00Z");

describe("scoreRelevance", () => {
  it("scores a relevant article higher than an unrelated one", () => {
    const relevant = scoreRelevance(
      {
        title: "Rethinking on-call rotations for reliability",
        excerpt: "incident response lessons",
      },
      knowledge,
      new Date("2026-09-06"),
      NOW,
    );
    const unrelated = scoreRelevance(
      { title: "A guide to sourdough baking at home", excerpt: "flour, water, salt" },
      knowledge,
      new Date("2026-09-06"),
      NOW,
    );
    expect(relevant.score).toBeGreaterThan(unrelated.score);
    expect(unrelated.score).toBe(0);
  });

  it("is deterministic", () => {
    const a = scoreRelevance(
      { title: "on-call reliability", excerpt: "" },
      knowledge,
      undefined,
      NOW,
    );
    const b = scoreRelevance(
      { title: "on-call reliability", excerpt: "" },
      knowledge,
      undefined,
      NOW,
    );
    expect(a).toEqual(b);
  });

  it("produces an explainable breakdown", () => {
    const r = scoreRelevance(
      { title: "on-call reliability and incident response", excerpt: "" },
      knowledge,
      undefined,
      NOW,
    );
    expect(r.reasons.length).toBeGreaterThan(0);
    for (const reason of r.reasons) {
      expect(reason.points).toBeGreaterThan(0);
      expect(reason.detail).toContain("Matches");
    }
    expect(r.reasons.map((x) => x.factor)).toContain("topics");
  });

  it("rewards recency and decays it to zero over three weeks", () => {
    const fresh = scoreRelevance(
      { title: "on-call", excerpt: "" },
      knowledge,
      new Date("2026-09-07"),
      NOW,
    );
    const old = scoreRelevance(
      { title: "on-call", excerpt: "" },
      knowledge,
      new Date("2026-07-01"),
      NOW,
    );
    expect(fresh.reasons.some((r) => r.factor === "recency")).toBe(true);
    expect(old.reasons.some((r) => r.factor === "recency")).toBe(false);
  });

  it("clamps to 0..100", () => {
    const r = scoreRelevance(
      {
        title:
          "incident response on-call reliability alerting postmortems incident response on-call",
        excerpt: "incident response on-call reliability postmortems alerting engineering leaders",
      },
      knowledge,
      new Date("2026-09-07"),
      NOW,
    );
    expect(r.score).toBeLessThanOrEqual(100);
    expect(r.score).toBeGreaterThanOrEqual(0);
  });
});
