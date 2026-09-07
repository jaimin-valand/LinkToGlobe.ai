import { describe, it, expect, vi, afterEach } from "vitest";
import { createTavilyProvider } from "./tavily";
import {
  MalformedResponseError,
  ProviderAuthError,
  ProviderRateLimitError,
  ProviderResponseError,
  ProviderTimeoutError,
} from "../types";

const okBody = {
  answer: "A short answer.",
  results: [
    {
      title: "Story one",
      url: "https://example.com/one",
      content: "Excerpt one",
      score: 0.9,
      published_date: "2026-09-01",
    },
    { title: "Story two", url: "https://example.com/two", content: "Excerpt two" },
  ],
};

function mockFetch(impl: () => Promise<Response> | Response) {
  vi.stubGlobal("fetch", vi.fn(impl));
}

afterEach(() => {
  vi.unstubAllGlobals();
  vi.restoreAllMocks();
});

describe("tavily provider", () => {
  it("normalises a valid response", async () => {
    mockFetch(() => new Response(JSON.stringify(okBody), { status: 200 }));
    const p = createTavilyProvider("tvly-test");
    const res = await p.search("widgets");
    expect(res.provider).toBe("tavily");
    expect(res.sources).toHaveLength(2);
    expect(res.sources[0]).toMatchObject({
      title: "Story one",
      url: "https://example.com/one",
      excerpt: "Excerpt one",
      providerRelevance: 0.9,
    });
    expect(res.sources[0].publishedAt).toBeInstanceOf(Date);
    expect(res.providerSummary).toBe("A short answer.");
  });

  it("maps 401 to an auth error", async () => {
    mockFetch(() => new Response("nope", { status: 401 }));
    await expect(createTavilyProvider("bad").search("x")).rejects.toBeInstanceOf(ProviderAuthError);
  });

  it("maps 429 to a rate-limit error", async () => {
    mockFetch(() => new Response("slow down", { status: 429 }));
    await expect(createTavilyProvider("k").search("x")).rejects.toBeInstanceOf(
      ProviderRateLimitError,
    );
  });

  it("maps other non-2xx to a provider error", async () => {
    mockFetch(() => new Response("boom", { status: 500 }));
    await expect(createTavilyProvider("k").search("x")).rejects.toBeInstanceOf(
      ProviderResponseError,
    );
  });

  it("throws MalformedResponseError when the body is not the expected shape", async () => {
    mockFetch(() => new Response(JSON.stringify({ nope: true }), { status: 200 }));
    await expect(createTavilyProvider("k").search("x")).rejects.toBeInstanceOf(
      MalformedResponseError,
    );
  });

  it("throws MalformedResponseError on invalid JSON", async () => {
    mockFetch(() => new Response("<html>not json</html>", { status: 200 }));
    await expect(createTavilyProvider("k").search("x")).rejects.toBeInstanceOf(
      MalformedResponseError,
    );
  });

  it("maps an aborted request to a timeout error", async () => {
    mockFetch(() => {
      const e = new Error("aborted");
      e.name = "AbortError";
      return Promise.reject(e);
    });
    await expect(createTavilyProvider("k").search("x", { timeoutMs: 5 })).rejects.toBeInstanceOf(
      ProviderTimeoutError,
    );
  });

  it("never puts the api key in the query string", async () => {
    const fetchMock = vi.fn<(url: string, init?: RequestInit) => Response>(
      () => new Response(JSON.stringify(okBody), { status: 200 }),
    );
    vi.stubGlobal("fetch", fetchMock);
    await createTavilyProvider("tvly-secret").search("x");
    const [url, init] = fetchMock.mock.calls[0];
    expect(String(url)).not.toContain("tvly-secret");
    expect(String(init?.body)).toContain("tvly-secret"); // in the POST body, server-side only
  });
});
