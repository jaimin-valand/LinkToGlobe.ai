import { canonicalizeUrl, hostOf } from "./url";
import { MalformedResponseError, type NormalizedSource } from "./types";

/** Strip any HTML and collapse whitespace. Provider excerpts are rendered as plain text. */
export function toPlainText(input: unknown, maxLen = 600): string {
  if (typeof input !== "string") return "";
  const noTags = input
    .replace(/<[^>]*>/g, " ")
    .replace(/&nbsp;/g, " ")
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'");
  const collapsed = noTags.replace(/\s+/g, " ").trim();
  return collapsed.length > maxLen ? collapsed.slice(0, maxLen - 1).trimEnd() + "…" : collapsed;
}

function parseDate(value: unknown): Date | undefined {
  if (value instanceof Date) return Number.isNaN(value.getTime()) ? undefined : value;
  if (typeof value !== "string" && typeof value !== "number") return undefined;
  const d = new Date(value);
  return Number.isNaN(d.getTime()) ? undefined : d;
}

interface CleanedSource extends NormalizedSource {
  canonicalUrl: string;
  host: string;
}

/**
 * Take provider-normalised sources, canonicalise their URLs, tidy text, drop
 * anything unusable, and deduplicate by canonical identity (first wins).
 */
export function cleanSources(raw: NormalizedSource[]): CleanedSource[] {
  if (!Array.isArray(raw)) throw new MalformedResponseError("Expected a list of sources.");

  const seen = new Set<string>();
  const out: CleanedSource[] = [];

  for (const s of raw) {
    if (!s || typeof s !== "object") continue;
    const title = toPlainText(s.title, 300).trim();
    if (!title) continue;

    let canonicalUrl: string;
    try {
      canonicalUrl = canonicalizeUrl(String(s.url ?? ""));
    } catch {
      continue; // no usable URL -> not a real source
    }
    if (seen.has(canonicalUrl)) continue;
    seen.add(canonicalUrl);

    const host = hostOf(canonicalUrl);
    out.push({
      title,
      url: canonicalUrl,
      canonicalUrl,
      host,
      publisher: s.publisher ? toPlainText(s.publisher, 120) : host || undefined,
      author: s.author ? toPlainText(s.author, 120) : undefined,
      publishedAt: parseDate(s.publishedAt),
      excerpt: toPlainText(s.excerpt, 600),
      providerSourceId: s.providerSourceId ? String(s.providerSourceId).slice(0, 200) : undefined,
      providerRelevance:
        typeof s.providerRelevance === "number" && s.providerRelevance >= 0
          ? Math.min(1, s.providerRelevance)
          : undefined,
      metadata: s.metadata && typeof s.metadata === "object" ? s.metadata : undefined,
    });
  }

  return out;
}
