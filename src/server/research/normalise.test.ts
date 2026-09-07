import { describe, it, expect } from "vitest";
import { cleanSources, toPlainText } from "./normalise";
import { MalformedResponseError, type NormalizedSource } from "./types";

describe("toPlainText", () => {
  it("strips HTML and collapses whitespace", () => {
    expect(toPlainText("<p>Hello   <b>world</b></p>\n\n&amp; more")).toBe("Hello world & more");
  });
  it("truncates with an ellipsis", () => {
    expect(toPlainText("a".repeat(50), 10)).toBe("aaaaaaaaa…");
  });
  it("returns empty for non-strings", () => {
    expect(toPlainText(null)).toBe("");
    expect(toPlainText(42)).toBe("");
  });
});

describe("cleanSources", () => {
  const valid: NormalizedSource[] = [
    {
      title: "  Big story about widgets  ",
      url: "https://www.example.com/story?utm_source=nl",
      excerpt: "<p>An <i>excerpt</i></p>",
      publishedAt: new Date("2026-09-01"),
      publisher: "Example News",
      providerRelevance: 0.8,
    },
    {
      title: "Same story",
      url: "http://example.com/story/#top", // same canonical identity as above
      excerpt: "dupe",
    },
    {
      title: "No url here",
      url: "",
      excerpt: "",
    },
  ];

  it("normalises a valid result and dedupes by canonical URL", () => {
    const out = cleanSources(valid);
    expect(out).toHaveLength(1);
    expect(out[0].title).toBe("Big story about widgets");
    expect(out[0].canonicalUrl).toBe("https://example.com/story");
    expect(out[0].excerpt).toBe("An excerpt");
    expect(out[0].publisher).toBe("Example News");
    expect(out[0].host).toBe("example.com");
    expect(out[0].providerRelevance).toBeCloseTo(0.8);
  });

  it("drops sources with no usable URL or no title", () => {
    const out = cleanSources([
      { title: "", url: "https://example.com/a", excerpt: "" },
      { title: "ok", url: "javascript:alert(1)", excerpt: "" },
    ]);
    expect(out).toHaveLength(0);
  });

  it("throws on a non-array response", () => {
    expect(() => cleanSources({} as unknown as NormalizedSource[])).toThrow(MalformedResponseError);
  });
});
