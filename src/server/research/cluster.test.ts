import { describe, it, expect } from "vitest";
import { clusterSources, sourceSimilarity, titleTokens, type ClusterInput } from "./cluster";

describe("titleTokens", () => {
  it("drops stopwords and short words", () => {
    expect([...titleTokens("The new report on widget safety")].sort()).toEqual([
      "report",
      "safety",
      "widget",
    ]);
  });
});

describe("clusterSources", () => {
  const day = (n: number) => new Date(2026, 8, n);

  it("groups sources that are clearly the same story", () => {
    const input: ClusterInput[] = [
      {
        id: "a",
        title: "Regulator opens inquiry into widget safety standards",
        host: "bbc.co.uk",
        publishedAt: day(1),
      },
      {
        id: "b",
        title: "Widget safety standards face regulator inquiry",
        host: "reuters.com",
        publishedAt: day(1),
      },
      {
        id: "c",
        title: "Inquiry launched over widget safety by regulator",
        host: "ft.com",
        publishedAt: day(2),
      },
      {
        id: "d",
        title: "Local bakery wins award for sourdough",
        host: "example.com",
        publishedAt: day(1),
      },
    ];
    const clusters = clusterSources(input);
    const storyCluster = clusters.find((c) => c.memberIds.includes("a"));
    expect(storyCluster?.memberIds.sort()).toEqual(["a", "b", "c"]);
    // The bakery story stays on its own.
    expect(clusters.find((c) => c.memberIds.includes("d"))?.memberIds).toEqual(["d"]);
  });

  it("does not merge unrelated stories", () => {
    const input: ClusterInput[] = [
      { id: "a", title: "Quarterly earnings beat expectations for retailer", host: "x.com" },
      { id: "b", title: "Volcano erupts on remote island prompting evacuation", host: "y.com" },
    ];
    const clusters = clusterSources(input);
    expect(clusters).toHaveLength(2);
  });

  it("is deterministic", () => {
    const input: ClusterInput[] = [
      { id: "a", title: "Widget prices rise sharply this quarter" },
      { id: "b", title: "Sharp rise in widget prices reported this quarter" },
    ];
    expect(clusterSources(input)).toEqual(clusterSources(input));
  });

  it("similarity is symmetric-ish and bounded", () => {
    const x: ClusterInput = { id: "x", title: "Widget safety inquiry begins", host: "a.com" };
    const y: ClusterInput = { id: "y", title: "Inquiry begins into widget safety", host: "a.com" };
    const s = sourceSimilarity(x, y);
    expect(s).toBeGreaterThan(0.5);
    expect(s).toBeLessThanOrEqual(1);
  });
});
