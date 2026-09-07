import { describe, it, expect } from "vitest";
import { canonicalizeUrl, urlHash, sameUrl, hostOf, InvalidUrlError } from "./url";

describe("canonicalizeUrl", () => {
  it("drops the fragment, lowercases host, strips www and trailing slash", () => {
    expect(canonicalizeUrl("https://WWW.Example.com/Article/#section")).toBe(
      "https://example.com/Article",
    );
  });

  it("removes known tracking params but keeps meaningful ones, sorted", () => {
    expect(canonicalizeUrl("https://example.com/p?utm_source=x&id=42&fbclid=abc&page=2")).toBe(
      "https://example.com/p?id=42&page=2",
    );
  });

  it("upgrades http to https for identity and normalises default ports", () => {
    expect(canonicalizeUrl("http://example.com:80/x/")).toBe("https://example.com/x");
  });

  it("treats these as the same source", () => {
    expect(
      sameUrl(
        "https://www.example.com/news/story?utm_campaign=abc",
        "http://example.com/news/story/#top",
      ),
    ).toBe(true);
  });

  it("does not treat different paths as the same", () => {
    expect(sameUrl("https://example.com/a", "https://example.com/b")).toBe(false);
  });

  it("rejects non-http(s) and junk", () => {
    expect(() => canonicalizeUrl("ftp://example.com")).toThrow(InvalidUrlError);
    expect(() => canonicalizeUrl("not a url")).toThrow(InvalidUrlError);
  });

  it("hash is stable and hex", () => {
    const c = canonicalizeUrl("https://example.com/x");
    expect(urlHash(c)).toMatch(/^[0-9a-f]{64}$/);
    expect(urlHash(c)).toBe(urlHash(canonicalizeUrl("https://www.example.com/x/")));
  });

  it("hostOf returns the bare host", () => {
    expect(hostOf("https://www.bbc.co.uk/news/x")).toBe("bbc.co.uk");
  });
});
