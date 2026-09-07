import { describe, it, expect } from "vitest";
import { classifyStrategy, HOOK_STRATEGIES, strategyDef } from "./strategies";

describe("classifyStrategy", () => {
  it("reads a trailing question mark as QUESTION", () => {
    expect(classifyStrategy("What if on-call rotations are the wrong unit entirely?")).toBe(
      "QUESTION",
    );
  });

  it("reads a first-person opener as STORY", () => {
    expect(classifyStrategy("When I joined the team, the pager went off nine times a night.")).toBe(
      "STORY",
    );
    expect(classifyStrategy("Last year we deleted our escalation policy.")).toBe("STORY");
  });

  it("reads a method framing as HOWTO", () => {
    expect(classifyStrategy("How to run an on-call rotation people do not resent")).toBe("HOWTO");
    expect(classifyStrategy("Here's how we cut alert volume by half")).toBe("HOWTO");
  });

  it("reads assumption-challenging language as CONTRARIAN", () => {
    expect(classifyStrategy("Follow-the-sun on-call isn't the fix everyone thinks it is.")).toBe(
      "CONTRARIAN",
    );
    expect(
      classifyStrategy("The biggest myth about reliability is that it needs more alerts."),
    ).toBe("CONTRARIAN");
  });

  it("falls back to STAT when a bare number leads and nothing else matches", () => {
    expect(classifyStrategy("40% of our pages last quarter were duplicates.")).toBe("STAT");
  });

  it("falls back to DIRECT for a plain statement", () => {
    expect(classifyStrategy("Reliability work is mostly deleting alerts.")).toBe("DIRECT");
  });

  it("is deterministic", () => {
    const s = "Why do we still page humans for things a script can fix?";
    expect(classifyStrategy(s)).toBe(classifyStrategy(s));
  });

  it("question mark wins over other markers", () => {
    // contains a number and a 'how' but ends with '?'
    expect(classifyStrategy("How did 3 changes cut our pages?")).toBe("QUESTION");
  });

  it("every strategy has a definition", () => {
    for (const s of HOOK_STRATEGIES) {
      expect(strategyDef(s.id).label).toBeTruthy();
      expect(strategyDef(s.id).guidance).toBeTruthy();
    }
  });
});
