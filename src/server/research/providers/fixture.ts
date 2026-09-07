import type { ProviderSearchResult, ResearchProvider } from "../types";

/**
 * Deterministic fixture provider for development and end-to-end tests ONLY.
 *
 * Selected with RESEARCH_PROVIDER=fixture. `getResearchProvider()` refuses to
 * return it when NODE_ENV is "production", so it can never serve real users.
 * Its sources are obvious placeholders (example.com, "[fixture]" titles) so
 * they can never be mistaken for real research.
 */
export function createFixtureProvider(): ResearchProvider {
  return {
    id: "fixture",
    async search(query: string): Promise<ProviderSearchResult> {
      const base = new Date("2026-09-06T00:00:00Z");
      const mk = (n: number, title: string, host: string, daysAgo: number, excerpt: string) => ({
        title: `[fixture] ${title}`,
        url: `https://${host}/fixture/${n}`,
        publisher: host,
        excerpt,
        publishedAt: new Date(base.getTime() - daysAgo * 86_400_000),
        providerRelevance: 0.9 - n * 0.05,
        providerSourceId: `fixture-${n}`,
      });

      return {
        provider: "fixture",
        query,
        providerSummary: `[fixture] Deterministic results for "${query}". Not real research.`,
        sources: [
          mk(
            1,
            `${query}: what changed this week`,
            "news.example.com",
            1,
            "A short fixture excerpt about a recent change.",
          ),
          mk(
            2,
            `${query} rethought for teams`,
            "blog.example.org",
            1,
            "Another fixture excerpt covering a similar point.",
          ),
          mk(
            3,
            `Analysis: ${query} and its trade-offs`,
            "analysis.example.net",
            2,
            "A fixture analysis piece with the same underlying story.",
          ),
          mk(
            4,
            `An unrelated fixture item about sourdough`,
            "food.example.com",
            3,
            "This one is here to test relevance scoring and clustering.",
          ),
          mk(
            5,
            `${query} — a single-outlet fixture report`,
            "solo.example.io",
            1,
            "Only this fixture publisher covers this angle.",
          ),
        ],
      };
    },
  };
}
