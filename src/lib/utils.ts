/**
 * Small, dependency-light UI helpers.
 */

/** Join class names, dropping falsy values. */
export function cn(...parts: Array<string | false | null | undefined>): string {
  return parts.filter(Boolean).join(" ");
}

/** Format an integer with locale grouping (e.g. 8807 -> "8,807"). */
export function formatCount(value: number, locale = "en-US"): string {
  if (!Number.isFinite(value)) {
    throw new TypeError("formatCount expects a finite number");
  }
  return new Intl.NumberFormat(locale).format(Math.trunc(value));
}

/** Turn a title into a URL-safe slug. */
export function slugify(input: string): string {
  return input
    .normalize("NFKD")
    .replace(/\p{Diacritic}/gu, "")
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "");
}
