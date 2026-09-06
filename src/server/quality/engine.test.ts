import { describe, it, expect } from "vitest";
import { runQualityChecks } from "./engine";

const solid = {
  title: "What five years of incident reviews taught me about on-call",
  hook: "Most on-call pain is not technical.",
  body:
    "After five years running incident reviews I keep seeing the same pattern. " +
    "Teams treat on-call as an individual burden when it is an organisational design problem. " +
    "The fix is boring: smaller services, clearer ownership, and a real handoff ritual. " +
    "None of that requires new tooling, just the discipline to write things down and rotate fairly.",
  sourceNotes: "Internal incident review notes, 2020-2025.",
};

describe("runQualityChecks", () => {
  it("passes a solid draft", () => {
    const r = runQualityChecks(solid);
    expect(r.passed).toBe(true);
    expect(r.score).toBeGreaterThan(80);
    expect(r.wordCount).toBeGreaterThan(50);
  });

  it("fails a draft with no title or body", () => {
    const r = runQualityChecks({ title: "", hook: "", body: "", sourceNotes: "" });
    expect(r.passed).toBe(false);
    expect(r.checks.find((c) => c.id === "title")?.status).toBe("fail");
    expect(r.checks.find((c) => c.id === "body-length")?.status).toBe("fail");
  });

  it("fails when placeholder text is left in", () => {
    const r = runQualityChecks({ ...solid, body: solid.body + " TODO: finish this section" });
    expect(r.passed).toBe(false);
    expect(r.checks.find((c) => c.id === "placeholders")?.status).toBe("fail");
  });

  it("warns about unsupported figures with no source notes", () => {
    const r = runQualityChecks({
      title: "Growth update",
      hook: "Big news.",
      body: "Our conversion improved by 45% and research shows this is typical for the sector at scale.",
      sourceNotes: "",
    });
    expect(r.checks.find((c) => c.id === "claims")?.status).toBe("warn");
  });
});
