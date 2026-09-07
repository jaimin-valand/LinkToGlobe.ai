import { describe, it, expect, vi, afterEach } from "vitest";
import { createGeminiProvider } from "./gemini";

const okBody = {
  candidates: [{ content: { parts: [{ text: "Idea one\nIdea two\nIdea three" }] } }],
};

function mockFetch(impl: () => Response | Promise<Response>) {
  vi.stubGlobal("fetch", vi.fn(impl));
}
afterEach(() => {
  vi.unstubAllGlobals();
  vi.restoreAllMocks();
});

const provider = () => createGeminiProvider({ apiKey: "gk", model: "gemini-2.0-flash" });
const knowledge = { headline: "", expertise: "", audience: "", tone: "", topics: [] };

describe("gemini provider", () => {
  it("parses a valid response into lines", async () => {
    mockFetch(() => new Response(JSON.stringify(okBody), { status: 200 }));
    const r = await provider().suggestIdeas(knowledge);
    expect(r.ok).toBe(true);
    expect(r.data).toEqual(["Idea one", "Idea two", "Idea three"]);
  });

  it("returns an error result on a non-2xx response, not a throw", async () => {
    mockFetch(() => new Response("bad key", { status: 401 }));
    const r = await provider().suggestIdeas(knowledge);
    expect(r.ok).toBe(false);
    expect(r.error).toContain("401");
  });

  it("returns an error result on an empty response", async () => {
    mockFetch(() => new Response(JSON.stringify({ candidates: [] }), { status: 200 }));
    const r = await provider().suggestIdeas(knowledge);
    expect(r.ok).toBe(false);
  });

  it("puts the key in a header, never the URL", async () => {
    const fetchMock = vi.fn<(url: string, init?: RequestInit) => Response>(
      () => new Response(JSON.stringify(okBody), { status: 200 }),
    );
    vi.stubGlobal("fetch", fetchMock);
    await provider().suggestIdeas(knowledge);
    const [url, init] = fetchMock.mock.calls[0];
    expect(String(url)).not.toContain("gk");
    expect((init?.headers as Record<string, string>)["x-goog-api-key"]).toBe("gk");
  });

  it("draftHooks parses the lines and never invents an API URL key", async () => {
    const fetchMock = vi.fn<(url: string, init?: RequestInit) => Response>(
      () =>
        new Response(
          JSON.stringify({
            candidates: [
              { content: { parts: [{ text: "Hook one?\n- Hook two\n3. Hook three" }] } },
            ],
          }),
          { status: 200 },
        ),
    );
    vi.stubGlobal("fetch", fetchMock);
    const r = await provider().draftHooks({
      idea: "On-call rotations",
      angle: "five years of data",
      notes: "pages dropped 40%",
      knowledge,
    });
    expect(r.ok).toBe(true);
    expect(r.data).toEqual(["Hook one?", "Hook two", "Hook three"]);
    expect(String(fetchMock.mock.calls[0][0])).not.toContain("gk");
  });

  it("draftHooks returns an error result on a non-2xx response", async () => {
    mockFetch(() => new Response("rate limited", { status: 429 }));
    const r = await provider().draftHooks({
      idea: "x",
      angle: "",
      notes: "",
      knowledge,
    });
    expect(r.ok).toBe(false);
    expect(r.error).toContain("429");
  });

  it("review distinguishes warnings from info", async () => {
    mockFetch(
      () =>
        new Response(
          JSON.stringify({
            candidates: [
              {
                content: {
                  parts: [{ text: "warning: unsupported claim\ninfo: tighten the intro" }],
                },
              },
            ],
          }),
          { status: 200 },
        ),
    );
    const r = await provider().review({ title: "t", hook: "h", body: "b", sourceNotes: "" });
    expect(r.ok).toBe(true);
    expect(r.data?.[0]).toEqual({ severity: "warning", message: "unsupported claim" });
    expect(r.data?.[1]).toEqual({ severity: "info", message: "tighten the intro" });
  });
});
