import { describe, it, expect } from "vitest";
import { evaluateHook } from "./evaluate";
import type { HookContext } from "./types";

const ctx: HookContext = {
  ideaText: "Rethinking on-call rotations for reliability after five years of incident data",
  topics: ["on-call", "reliability"],
  factText:
    "We looked at 5 years of incident data. Pages dropped 40% after we removed duplicate alerts.",
};

describe("evaluateHook", () => {
  it("returns a full evaluation with a strategy and scores", () => {
    const e = evaluateHook("Why do we still page humans for what a script can fix?", ctx);
    expect(e.strategy).toBe("QUESTION");
    expect(e.relevanceScore).toBeGreaterThanOrEqual(0);
    expect(e.clarityScore).toBeGreaterThan(0);
    expect(e.wordCount).toBe(12);
    expect(e.warnings).toEqual([]);
  });

  it("flags a figure that is not in the notes", () => {
    const e = evaluateHook("On-call burnout costs the industry 90% of its senior engineers.", ctx);
    expect(e.warnings.map((w) => w.code)).toContain("unverified-figure");
  });

  it("accepts a figure that is in the notes", () => {
    const e = evaluateHook("Removing duplicate alerts cut our pages by 40%.", ctx);
    expect(e.warnings.map((w) => w.code)).not.toContain("unverified-figure");
  });

  it("flags an over-long hook", () => {
    const long =
      "After we spent the better part of five long years carefully collecting and then slowly analysing almost every single incident that any of our on-call engineers were ever actually paged for during that period, we finally started to understand what the real underlying problem had been all along.";
    const e = evaluateHook(long, ctx);
    expect(e.warnings.map((w) => w.code)).toContain("too-long");
  });

  it("flags more than two sentences", () => {
    const e = evaluateHook("We were wrong. On-call was fine. The alerts were not.", ctx);
    expect(e.warnings.map((w) => w.code)).toContain("multi-sentence");
  });

  it("flags placeholder text", () => {
    const e = evaluateHook("Your hook here — replace this later", ctx);
    expect(e.warnings.map((w) => w.code)).toContain("placeholder");
  });

  it("is deterministic", () => {
    const s = "Five years of incident data reshaped our on-call rotations.";
    expect(evaluateHook(s, ctx)).toEqual(evaluateHook(s, ctx));
  });
});
