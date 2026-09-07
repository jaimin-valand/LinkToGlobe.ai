import { createHash } from "node:crypto";

/**
 * Deterministic, conservative URL canonicalisation for deduplication.
 *
 * The goal is to recognise "the same page" across trivial differences without
 * ever changing which page a link points to. So we normalise casing, drop the
 * fragment, remove a known set of tracking parameters, and tidy an empty path.
 * We do NOT touch the path, reorder meaningful query params, follow redirects,
 * or fetch anything.
 */

const TRACKING_PARAMS = new Set([
  "utm_source",
  "utm_medium",
  "utm_campaign",
  "utm_term",
  "utm_content",
  "utm_id",
  "gclid",
  "fbclid",
  "mc_cid",
  "mc_eid",
  "igshid",
  "ref",
  "ref_src",
  "spm",
  "cmpid",
  "s_cid",
  "_hsenc",
  "_hsmi",
  "vero_id",
  "yclid",
]);

export function canonicalizeUrl(raw: string): string {
  let url: URL;
  try {
    url = new URL(raw.trim());
  } catch {
    throw new InvalidUrlError(raw);
  }

  if (url.protocol !== "http:" && url.protocol !== "https:") {
    throw new InvalidUrlError(raw);
  }

  // http -> https is a safe upgrade for identity purposes only; the stored
  // canonicalUrl is what we link to, and https is the norm. Keep http if the
  // provider explicitly gave http and the host looks like a bare IP (rare).
  if (url.protocol === "http:") url.protocol = "https:";

  url.hostname = url.hostname.toLowerCase().replace(/^www\./, "");
  url.hash = "";

  // Drop only known tracking params. Keep the rest, sorted for stable identity.
  const kept: [string, string][] = [];
  for (const [k, v] of url.searchParams) {
    if (!TRACKING_PARAMS.has(k.toLowerCase())) kept.push([k, v]);
  }
  kept.sort(([a], [b]) => (a < b ? -1 : a > b ? 1 : 0));
  url.search = "";
  for (const [k, v] of kept) url.searchParams.append(k, v);

  // Normalise an empty / root path and a single trailing slash.
  if (url.pathname === "" || url.pathname === "/") {
    url.pathname = "/";
  } else if (url.pathname.length > 1 && url.pathname.endsWith("/")) {
    url.pathname = url.pathname.replace(/\/+$/, "");
  }

  // Default ports.
  if (
    (url.protocol === "https:" && url.port === "443") ||
    (url.protocol === "http:" && url.port === "80")
  ) {
    url.port = "";
  }

  let out = url.toString();
  if (out.endsWith("?")) out = out.slice(0, -1);
  return out;
}

/** SHA-256 of the canonical URL — used for the unique constraint (URLs can be long). */
export function urlHash(canonical: string): string {
  return createHash("sha256").update(canonical).digest("hex");
}

/** True when two raw URLs resolve to the same canonical identity. */
export function sameUrl(a: string, b: string): boolean {
  try {
    return canonicalizeUrl(a) === canonicalizeUrl(b);
  } catch {
    return false;
  }
}

/** Bare registrable-ish host, for clustering by publisher domain. */
export function hostOf(canonicalOrRaw: string): string {
  try {
    return new URL(canonicalOrRaw).hostname.toLowerCase().replace(/^www\./, "");
  } catch {
    return "";
  }
}

export class InvalidUrlError extends Error {
  constructor(url: string) {
    super(`Not a usable http(s) URL: ${url.slice(0, 120)}`);
    this.name = "InvalidUrlError";
  }
}
