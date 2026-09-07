import { describe, it, expect } from "vitest";
import { extractSignals, type ClusterView, type SignalSourceView } from "./signals";

const NOW = new Date("2026-09-07T00:00:00Z");

function src(id: string, over: Partial<SignalSourceView> = {}): SignalSourceView {
  return {
    id,
    title: `Title ${id}`,
    excerpt: "",
    host: `${id}.com`,
    publisher: `${id} News`,
    publishedAt: new Date("2026-09-06"),
    ...over,
  };
}

describe("extractSignals", () => {
  it("keeps every signal traceable to its source ids", () => {
    const sources = new Map([
      ["a", src("a")],
      ["b", src("b")],
      ["c", src("c")],
    ]);
    const clusters: ClusterView[] = [{ key: "c0", title: "Big story", sourceIds: ["a", "b", "c"] }];
    const signals = extractSignals("query", clusters, sources, [], NOW);

    const rising = signals.find((s) => s.kind === "RISING");
    expect(rising).toBeDefined();
    expect(rising?.sourceIds.sort()).toEqual(["a", "b", "c"]);
    expect(rising?.evidenceKind).toBe("DIRECT");
  });

  it("marks a two-source 'same point' observation as an inference", () => {
    const sources = new Map([
      ["a", src("a")],
      ["b", src("b")],
    ]);
    const clusters: ClusterView[] = [{ key: "c0", title: "A shared point", sourceIds: ["a", "b"] }];
    const [signal] = extractSignals("q", clusters, sources, [], NOW);
    expect(signal.kind).toBe("RECURRING");
    expect(signal.evidenceKind).toBe("INFERENCE");
    expect(signal.detail.toLowerCase()).toContain("inferred");
  });

  it("emits a single-source CHANGE signal as direct evidence", () => {
    const sources = new Map([["a", src("a", { title: "One outlet reports X" })]]);
    const clusters: ClusterView[] = [
      { key: "c0", title: "One outlet reports X", sourceIds: ["a"] },
    ];
    const signals = extractSignals("q", clusters, sources, [], NOW);
    const change = signals.find((s) => s.kind === "CHANGE");
    expect(change?.evidenceKind).toBe("DIRECT");
    expect(change?.sourceIds).toEqual(["a"]);
  });

  it("emits a GAP signal (inference, no sources) for uncovered topics", () => {
    const sources = new Map([
      ["a", src("a", { title: "Widgets in the news", excerpt: "widget widget" })],
    ]);
    const clusters: ClusterView[] = [{ key: "c0", title: "Widgets in the news", sourceIds: ["a"] }];
    const signals = extractSignals("widgets", clusters, sources, ["governance", "ethics"], NOW);
    const gap = signals.find((s) => s.kind === "GAP");
    expect(gap).toBeDefined();
    expect(gap?.evidenceKind).toBe("INFERENCE");
    expect(gap?.sourceIds).toEqual([]);
    expect(gap?.summary.toLowerCase()).toContain("governance");
  });

  it("does not emit a GAP when every topic word is covered", () => {
    const sources = new Map([["a", src("a", { title: "governance and ethics of widgets" })]]);
    const clusters: ClusterView[] = [
      { key: "c0", title: "governance and ethics of widgets", sourceIds: ["a"] },
    ];
    const signals = extractSignals("widgets", clusters, sources, ["governance", "ethics"], NOW);
    expect(signals.some((s) => s.kind === "GAP")).toBe(false);
  });

  it("is deterministic", () => {
    const sources = new Map([
      ["a", src("a")],
      ["b", src("b")],
    ]);
    const clusters: ClusterView[] = [{ key: "c0", title: "T", sourceIds: ["a", "b"] }];
    expect(extractSignals("q", clusters, sources, ["x"], NOW)).toEqual(
      extractSignals("q", clusters, sources, ["x"], NOW),
    );
  });
});
