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
 * Tavily search adapter (https://tavily.com) — a licensed search API built for
 * research use. Official REST endpoint only; no scraping, no browser.
 *
 * Config: RESEARCH_PROVIDER=tavily, RESEARCH_API_KEY=tvly-...
 */
const ENDPOINT = "https://api.tavily.com/search";
const DEFAULT_TIMEOUT_MS = 15_000;

interface TavilyResult {
  title?: unknown;
  url?: unknown;
  content?: unknown;
  score?: unknown;
  published_date?: unknown;
}
interface TavilyResponse {
  answer?: unknown;
  results?: unknown;
}

export function createTavilyProvider(apiKey: string): ResearchProvider {
  return {
    id: "tavily",
    async search(
      query: string,
      options: ResearchSearchOptions = {},
    ): Promise<ProviderSearchResult> {
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), options.timeoutMs ?? DEFAULT_TIMEOUT_MS);

      let res: Response;
      try {
        res = await fetch(ENDPOINT, {
          method: "POST",
          headers: { "content-type": "application/json" },
          signal: controller.signal,
          body: JSON.stringify({
            api_key: apiKey,
            query,
            search_depth: "basic",
            include_answer: true,
            max_results: Math.min(Math.max(options.limit ?? 10, 1), 20),
            days: options.sinceDays,
          }),
        });
      } catch (err) {
        if ((err as Error).name === "AbortError") throw new ProviderTimeoutError();
        throw new ProviderResponseError(
          `Network error contacting Tavily: ${(err as Error).message}`,
        );
      } finally {
        clearTimeout(timeout);
      }

      if (res.status === 401 || res.status === 403) throw new ProviderAuthError();
      if (res.status === 429) throw new ProviderRateLimitError();
      if (!res.ok) {
        throw new ProviderResponseError(`Tavily responded ${res.status}.`);
      }

      let json: TavilyResponse;
      try {
        json = (await res.json()) as TavilyResponse;
      } catch {
        throw new MalformedResponseError("Tavily response was not valid JSON.");
      }
      if (!json || typeof json !== "object" || !Array.isArray(json.results)) {
        throw new MalformedResponseError("Tavily response had no results array.");
      }

      const sources: NormalizedSource[] = (json.results as TavilyResult[]).map((r) => ({
        title: typeof r.title === "string" ? r.title : "",
        url: typeof r.url === "string" ? r.url : "",
        excerpt: typeof r.content === "string" ? r.content : "",
        publishedAt:
          typeof r.published_date === "string" || typeof r.published_date === "number"
            ? new Date(r.published_date)
            : undefined,
        providerRelevance: typeof r.score === "number" ? r.score : undefined,
        providerSourceId: typeof r.url === "string" ? r.url : undefined,
      }));

      return {
        provider: "tavily",
        query,
        sources,
        providerSummary: typeof json.answer === "string" ? json.answer : undefined,
      };
    },
  };
}
