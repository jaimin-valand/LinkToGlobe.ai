import { describe, it, expect } from "vitest";
import { scoreDistinctness } from "./originality";

describe("scoreDistinctness", () => {
  it("gives a lone candidate a full score and no neighbour", () => {
    const [only] = scoreDistinctness(["On-call rotations are overdue for a rethink."]);
    expect(only.distinctScore).toBe(100);
    expect(only.nearestIndex).toBeNull();
    expect(only.nearDuplicate).toBe(false);
  });

  it("flags two near-identical lines as near-duplicates of each other", () => {
    const r = scoreDistinctness([
      "Five years of incident data changed our on-call rotations.",
      "Our on-call rotations changed after five years of incident data.",
      "Nobody enjoys being paged at 3am, and the data shows it.",
    ]);
    expect(r[0].nearDuplicate).toBe(true);
    expect(r[1].nearDuplicate).toBe(true);
    expect(r[0].nearestIndex).toBe(1);
    expect(r[2].nearDuplicate).toBe(false);
    expect(r[2].distinctScore).toBeGreaterThan(r[0].distinctScore);
  });

  it("is deterministic and order-aligned with the input", () => {
    const input = [
      "alpha reliability signal",
      "beta incident response",
      "alpha reliability signal",
    ];
    const a = scoreDistinctness(input);
    const b = scoreDistinctness(input);
    expect(a).toEqual(b);
    expect(a[0].nearestIndex).toBe(2);
  });
});
