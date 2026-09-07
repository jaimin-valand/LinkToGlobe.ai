import { describe, it, expect } from "vitest";
import { toOpportunity, type OpportunitySignal } from "./opportunity";

const base: OpportunitySignal = {
  id: "sig1",
  kind: "RISING",
  evidenceKind: "DIRECT",
  summary: '3 sources are covering "Widget safety inquiry".',
  detail: "Publishers: A, B, C.",
  relevanceScore: 60,
  relevanceReasons: [
    {
      factor: "topics",
      label: "Overlaps your topics",
      points: 24,
      detail: "Matches words: widget",
    },
  ],
  clusterTitle: "Widget safety inquiry",
  sources: [
    { id: "s1", title: "A reports", url: "https://a.com/x", publisher: "A" },
    { id: "s2", title: "B reports", url: "https://b.com/y", publisher: "B" },
  ],
};

describe("toOpportunity", () => {
  it("builds a structured opportunity from a signal", () => {
    const o = toOpportunity(base);
    expect(o.signalId).toBe("sig1");
    expect(o.topic).toBe("Widget safety inquiry");
    expect(o.whyItMatters).toBe("Publishers: A, B, C.");
    expect(o.userRelevance).toContain("Overlaps your topics (+24)");
    expect(o.suggestedAngle.toLowerCase()).toContain("widget safety inquiry");
    expect(o.isInference).toBe(false);
    expect(o.nextAction).toContain("read the linked sources");
  });

  it("flags inference signals and tells the user to bring evidence", () => {
    const o = toOpportunity({ ...base, evidenceKind: "INFERENCE", sources: [] });
    expect(o.isInference).toBe(true);
    expect(o.nextAction.toLowerCase()).toContain("inference");
  });

  it("confidence is bounded and lower without relevance", () => {
    const strong = toOpportunity(base).confidence;
    const weak = toOpportunity({ ...base, relevanceScore: 0, relevanceReasons: [] }).confidence;
    expect(strong).toBeGreaterThan(weak);
    expect(weak).toBeGreaterThanOrEqual(5);
    expect(strong).toBeLessThanOrEqual(95);
  });

  it("is deterministic", () => {
    expect(toOpportunity(base)).toEqual(toOpportunity(base));
  });
});
