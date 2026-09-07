import { describe, it, expect } from "vitest";
import { checkClarity } from "./readability";

describe("checkClarity", () => {
  it("rates a short, plain line as clear", () => {
    const r = checkClarity("We page humans for problems a script could fix.");
    expect(r.grade).toBe("clear");
    expect(r.score).toBeGreaterThanOrEqual(80);
  });

  it("penalises business jargon", () => {
    const plain = checkClarity("We cut the number of alerts by removing duplicates.");
    const jargon = checkClarity(
      "We leveraged synergy to move the needle on our alerting paradigm.",
    );
    expect(jargon.score).toBeLessThan(plain.score);
    expect(jargon.notes.find((n) => n.label === "Jargon")?.status).toBe("warn");
  });

  it("penalises filler words", () => {
    const r = checkClarity("This is basically just a really very simple change actually.");
    expect(r.notes.find((n) => n.label === "Filler")?.status).toBe("warn");
    expect(r.score).toBeLessThan(85);
  });

  it("flags a very long single sentence", () => {
    const long =
      "When you look at the way that most engineering organisations approach the problem of on-call rotations and the associated escalation policies that sit underneath them it becomes clear that the incentives are misaligned in ways that are difficult to fix.";
    const r = checkClarity(long);
    expect(r.notes.find((n) => n.label === "Sentence length")?.status).toBe("warn");
  });

  it("is deterministic", () => {
    const s = "Reliability work is mostly deleting alerts nobody reads.";
    expect(checkClarity(s)).toEqual(checkClarity(s));
  });

  it("keeps the score within 0..100", () => {
    const r = checkClarity(
      "Basically we literally just leveraged synergy and bandwidth to disrupt the paradigm actually really very much.",
    );
    expect(r.score).toBeGreaterThanOrEqual(0);
    expect(r.score).toBeLessThanOrEqual(100);
  });
});
