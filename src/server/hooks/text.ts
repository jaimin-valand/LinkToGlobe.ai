/** Small deterministic text helpers shared by the hook checks. */

const STOPWORDS = new Set(
  "the a an and or but of to in on for with at by from as is are was were be been being this that these those it its into over after before how why what when who will would can could should not you your our their they them we us new says say said about more most than then them".split(
    " ",
  ),
);

/** Lowercased content words of length >= 3, stopwords removed. */
export function contentTokens(text: string): string[] {
  return text
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, " ")
    .split(/\s+/)
    .filter((w) => w.length >= 3 && !STOPWORDS.has(w));
}

export function tokenSet(text: string): Set<string> {
  return new Set(contentTokens(text));
}

export function jaccard(a: Set<string>, b: Set<string>): number {
  if (a.size === 0 || b.size === 0) return 0;
  let inter = 0;
  for (const t of a) if (b.has(t)) inter++;
  return inter / (a.size + b.size - inter);
}

export function wordCount(text: string): number {
  const t = text.trim();
  return t ? t.split(/\s+/).length : 0;
}

export function sentenceCount(text: string): number {
  const parts = text
    .trim()
    .split(/[.!?]+(?:\s|$)/)
    .filter((s) => s.trim().length > 0);
  return Math.max(1, parts.length);
}

/** Rough syllable estimate for one word. Good enough for a readability index. */
export function syllables(word: string): number {
  const w = word.toLowerCase().replace(/[^a-z]/g, "");
  if (!w) return 0;
  if (w.length <= 3) return 1;
  const groups = w
    .replace(/(?:[^laeiouy]es|ed|[^laeiouy]e)$/, "")
    .replace(/^y/, "")
    .match(/[aeiouy]{1,2}/g);
  return Math.max(1, groups ? groups.length : 1);
}

/** Digit runs that look like figures the reader would check: 12, 3.4, 40%, 2026, 1,200. */
export function figureTokens(text: string): string[] {
  return (text.match(/\d[\d,.]*\s?%?/g) ?? []).map((m) =>
    m.replace(/\s+/g, "").replace(/[.,]$/, ""),
  );
}
