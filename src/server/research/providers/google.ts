import {
  MalformedResponseError,
  ProviderAuthError,
  ProviderRateLimitError,
  ProviderResponseError,
  ProviderTimeoutError,
  type NormalizedSource,
  type ProviderSearchResult,
  type ResearchProvider,
  type ResearchSearchOptions,
} from "../types";

/**
 * Google Programmable Search Engine (Custom Search JSON API).
 * https://developers.google.com/custom-search/v1/overview
 *
 * Config: RESEARCH_PROVIDER=google, RESEARCH_API_KEY=<api key>,
 *         RESEARCH_GOOGLE_CX=<search engine id>
 *
 * Official REST API only — Google's own index, no scraping. `dateRestrict`
 * biases toward recent pages for near-real-time coverage.
 */
const ENDPOINT = "https://www.googleapis.com/customsearch/v1";
const DEFAULT_TIMEOUT_MS = 15_000;

interface GoogleItem {
  title?: unknown;
  link?: unknown;
  snippet?: unknown;
  displayLink?: unknown;
  pagemap?: {
    metatags?: Array<Record<string, unknown>>;
    newsarticle?: Array<Record<string, unknown>>;
  };
}
interface GoogleResponse {
  items?: unknown;
  error?: { code?: number; message?: string };
}

function publishedFrom(item: GoogleItem): Date | undefined {
  const tags = item.pagemap?.metatags?.[0] ?? {};
  const raw =
    tags["article:published_time"] ??
    tags["og:updated_time"] ??
    tags["date"] ??
    item.pagemap?.newsarticle?.[0]?.datepublished;
  if (typeof raw !== "string") return undefined;
  const d = new Date(raw);
  return Number.isNaN(d.getTime()) ? undefined : d;
}

function authorFrom(item: GoogleItem): string | undefined {
  const tags = item.pagemap?.metatags?.[0] ?? {};
  const a = tags["author"] ?? tags["article:author"] ?? tags["twitter:creator"];
  return typeof a === "string" && a.trim() ? a.trim() : undefined;
}

export function createGoogleProvider(config: { apiKey: string; cx: string }): ResearchProvider {
  return {
    id: "google",
    async search(
      query: string,
      options: ResearchSearchOptions = {},
    ): Promise<ProviderSearchResult> {
      const params = new URLSearchParams({
        key: config.apiKey,
        cx: config.cx,
        q: query,
        num: String(Math.min(Math.max(options.limit ?? 10, 1), 10)),
      });
      if (options.sinceDays && options.sinceDays > 0) {
        params.set("dateRestrict", `d${Math.min(options.sinceDays, 365)}`);
      }

      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), options.timeoutMs ?? DEFAULT_TIMEOUT_MS);

      let res: Response;
      try {
        res = await fetch(`${ENDPOINT}?${params.toString()}`, {
          method: "GET",
          headers: { accept: "application/json" },
          signal: controller.signal,
        });
      } catch (err) {
        if ((err as Error).name === "AbortError") throw new ProviderTimeoutError();
        throw new ProviderResponseError(
          `Network error contacting Google: ${(err as Error).message}`,
        );
      } finally {
        clearTimeout(timeout);
      }

      if (res.status === 429) throw new ProviderRateLimitError();

      let json: GoogleResponse;
      try {
        json = (await res.json()) as GoogleResponse;
      } catch {
        throw new MalformedResponseError("Google response was not valid JSON.");
      }

      if (!res.ok) {
        // Google puts quota / bad-key detail in `error`. Quota checks first so a
        // 403 caused by quota is a rate-limit, not an auth failure.
        if (json.error?.code === 429 || /quota|rate limit/i.test(json.error?.message ?? "")) {
          throw new ProviderRateLimitError();
        }
        if (res.status === 401 || res.status === 403 || json.error?.code === 400) {
          throw new ProviderAuthError();
        }
        throw new ProviderResponseError(`Google responded ${res.status}.`);
      }

      if (json.items === undefined) {
        // Valid response, just no results.
        return { provider: "google", query, sources: [] };
      }
      if (!Array.isArray(json.items)) {
        throw new MalformedResponseError("Google response `items` was not an array.");
      }

      const sources: NormalizedSource[] = (json.items as GoogleItem[]).map((item) => ({
        title: typeof item.title === "string" ? item.title : "",
        url: typeof item.link === "string" ? item.link : "",
        excerpt: typeof item.snippet === "string" ? item.snippet : "",
        publisher: typeof item.displayLink === "string" ? item.displayLink : undefined,
        author: authorFrom(item),
        publishedAt: publishedFrom(item),
        providerSourceId: typeof item.link === "string" ? item.link : undefined,
      }));

      return { provider: "google", query, sources };
    },
  };
}
