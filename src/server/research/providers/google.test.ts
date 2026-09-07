import { describe, it, expect, vi, afterEach } from "vitest";
import { createGoogleProvider } from "./google";
import {
  MalformedResponseError,
  ProviderAuthError,
  ProviderRateLimitError,
  ProviderResponseError,
} from "../types";

const okBody = {
  items: [
    {
      title: "Story one",
      link: "https://news.example.com/one",
      snippet: "Excerpt one",
      displayLink: "news.example.com",
      pagemap: {
        metatags: [{ "article:published_time": "2026-09-01T00:00:00Z", author: "A. Writer" }],
      },
    },
    { title: "Story two", link: "https://blog.example.org/two", snippet: "Excerpt two" },
  ],
};

function mockFetch(impl: () => Response | Promise<Response>) {
  vi.stubGlobal("fetch", vi.fn(impl));
}
afterEach(() => {
  vi.unstubAllGlobals();
  vi.restoreAllMocks();
});

const provider = () => createGoogleProvider({ apiKey: "k", cx: "cx123" });

describe("google provider", () => {
  it("normalises a valid response including publisher, author and date", async () => {
    mockFetch(() => new Response(JSON.stringify(okBody), { status: 200 }));
    const res = await provider().search("widgets");
    expect(res.provider).toBe("google");
    expect(res.sources).toHaveLength(2);
    expect(res.sources[0]).toMatchObject({
      title: "Story one",
      url: "https://news.example.com/one",
      excerpt: "Excerpt one",
      publisher: "news.example.com",
      author: "A. Writer",
    });
    expect(res.sources[0].publishedAt?.toISOString()).toBe("2026-09-01T00:00:00.000Z");
  });

  it("returns an empty result set when Google has no items", async () => {
    mockFetch(() => new Response(JSON.stringify({ searchInformation: {} }), { status: 200 }));
    expect((await provider().search("obscure")).sources).toEqual([]);
  });

  it("maps a bad key to an auth error", async () => {
    mockFetch(
      () =>
        new Response(JSON.stringify({ error: { code: 400, message: "API key not valid" } }), {
          status: 400,
        }),
    );
    await expect(provider().search("x")).rejects.toBeInstanceOf(ProviderAuthError);
  });

  it("maps rate limiting (429 status and quota message)", async () => {
    mockFetch(() => new Response(JSON.stringify({ error: { code: 429 } }), { status: 429 }));
    await expect(provider().search("x")).rejects.toBeInstanceOf(ProviderRateLimitError);

    mockFetch(
      () =>
        new Response(JSON.stringify({ error: { code: 403, message: "Quota exceeded" } }), {
          status: 403,
        }),
    );
    await expect(provider().search("x")).rejects.toBeInstanceOf(ProviderRateLimitError);
  });

  it("maps other errors and malformed bodies", async () => {
    mockFetch(() => new Response(JSON.stringify({ error: { code: 500 } }), { status: 500 }));
    await expect(provider().search("x")).rejects.toBeInstanceOf(ProviderResponseError);

    mockFetch(() => new Response("<html>", { status: 200 }));
    await expect(provider().search("x")).rejects.toBeInstanceOf(MalformedResponseError);

    mockFetch(() => new Response(JSON.stringify({ items: "nope" }), { status: 200 }));
    await expect(provider().search("x")).rejects.toBeInstanceOf(MalformedResponseError);
  });

  it("sends the key and cx as query params to the official endpoint only", async () => {
    const fetchMock = vi.fn<(url: string) => Response>(
      () => new Response(JSON.stringify(okBody), { status: 200 }),
    );
    vi.stubGlobal("fetch", fetchMock);
    await provider().search("x", { sinceDays: 7 });
    const url = String(fetchMock.mock.calls[0][0]);
    expect(url.startsWith("https://www.googleapis.com/customsearch/v1?")).toBe(true);
    expect(url).toContain("cx=cx123");
    expect(url).toContain("dateRestrict=d7");
  });
});
