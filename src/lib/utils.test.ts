import { describe, it, expect } from "vitest";
import { cn, formatCount, slugify } from "@/lib/utils";

describe("cn", () => {
  it("joins truthy class names and drops falsy ones", () => {
    expect(cn("a", false, undefined, "b", null, "c")).toBe("a b c");
  });
});

describe("formatCount", () => {
  it("adds locale grouping and truncates fractions", () => {
    expect(formatCount(8807)).toBe("8,807");
    expect(formatCount(1234.9)).toBe("1,234");
  });

  it("throws on non-finite input", () => {
    expect(() => formatCount(Number.NaN)).toThrow(TypeError);
  });
});

describe("slugify", () => {
  it("produces a url-safe slug", () => {
    expect(slugify("  Hello,  World! ")).toBe("hello-world");
  });

  it("strips diacritics", () => {
    expect(slugify("Café Déjà Vu")).toBe("cafe-deja-vu");
  });
});
