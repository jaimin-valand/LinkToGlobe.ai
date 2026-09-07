import { describe, it, expect, vi, beforeEach } from "vitest";
import type { ProviderSearchResult } from "./types";

// ── Mocks (hoisted so the vi.mock factories can see them) ───────────────────

let idCounter = 0;
const nextId = (p: string) => `${p}_${++idCounter}`;

const { db, provider } = vi.hoisted(() => {
  const db = {
    researchRun: {
      findFirst: vi.fn(),
      count: vi.fn(),
      create: vi.fn(),
      update: vi.fn(),
      findMany: vi.fn(),
    },
    researchSource: { create: vi.fn(), findMany: vi.fn() },
    storyCluster: { create: vi.fn() },
    signal: { create: vi.fn(), findFirst: vi.fn(), update: vi.fn(), findMany: vi.fn() },
    idea: { create: vi.fn(), findMany: vi.fn(), findFirst: vi.fn() },
    activityLog: { create: vi.fn() },
    $transaction: vi.fn(),
  };
  db.$transaction.mockImplementation(async (cb: (tx: unknown) => unknown) => cb(db));
  const provider = { id: "tavily", search: vi.fn() };
  return { db, provider };
});

vi.mock("@/lib/db", () => ({ prisma: db }));

vi.mock("./provider", async (importOriginal) => {
  const actual = (await importOriginal()) as object;
  return {
    ...actual,
    requireResearchProvider: () => provider,
    getResearchProvider: () => provider,
  };
});

vi.mock("@/server/knowledge/service", () => ({
  getKnowledge: vi.fn(async () => ({
    headline: "SRE",
    expertise: "on-call reliability incident response",
    audience: "engineering leaders",
    tone: "",
    topics: ["on-call", "reliability"],
    sources: "",
  })),
}));

// Import after mocks.
import { runResearch, getRunDetail, saveSignalAsIdea, NotFoundError } from "./service";

function providerResult(over: Partial<ProviderSearchResult> = {}): ProviderSearchResult {
  return {
    provider: "tavily",
    query: "on-call reliability",
    sources: [
      {
        title: "Rethinking on-call rotations for reliability",
        url: "https://a.com/story?utm_source=nl",
        excerpt: "incident response lessons from five years",
        publishedAt: new Date("2026-09-06"),
        publisher: "A News",
      },
      {
        title: "On-call rotations rethought for reliability",
        url: "https://b.com/story",
        excerpt: "similar coverage of the same point",
        publishedAt: new Date("2026-09-06"),
        publisher: "B News",
      },
    ],
    ...over,
  };
}

beforeEach(() => {
  vi.clearAllMocks();
  idCounter = 0;
  db.researchRun.findFirst.mockResolvedValue(null); // no recent run
  db.researchRun.count.mockResolvedValue(0);
  db.researchRun.create.mockImplementation(async ({ data }) => ({ id: "run_1", ...data }));
  db.researchRun.update.mockResolvedValue({});
  db.storyCluster.create.mockImplementation(async ({ data }) => ({ id: nextId("cl"), ...data }));
  db.researchSource.create.mockImplementation(async ({ data }) => ({ id: nextId("src"), ...data }));
  db.signal.create.mockImplementation(async ({ data }) => ({ id: nextId("sig"), ...data }));
  db.activityLog.create.mockResolvedValue({});
  provider.search.mockResolvedValue(providerResult());
});

describe("runResearch", () => {
  it("persists a run, its sources, clusters and signals, then marks it completed", async () => {
    const { runId } = await runResearch("owner", "on-call reliability", {
      now: new Date("2026-09-07"),
    });
    expect(runId).toBe("run_1");

    expect(db.researchRun.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({ userId: "owner", status: "RUNNING" }),
      }),
    );
    expect(db.researchSource.create).toHaveBeenCalledTimes(2);
    expect(db.storyCluster.create).toHaveBeenCalled();
    expect(db.signal.create).toHaveBeenCalled();

    // Every persisted row is scoped to the owner.
    for (const call of [
      ...db.researchSource.create.mock.calls,
      ...db.storyCluster.create.mock.calls,
      ...db.signal.create.mock.calls,
    ]) {
      expect(call[0].data.userId).toBe("owner");
    }

    expect(db.researchRun.update).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { id: "run_1" },
        data: expect.objectContaining({ status: "COMPLETED", sourceCount: 2 }),
      }),
    );
  });

  it("deduplicates sources that share a canonical URL", async () => {
    provider.search.mockResolvedValue(
      providerResult({
        sources: [
          { title: "Story", url: "https://a.com/x?utm_source=nl", excerpt: "one" },
          { title: "Same story", url: "http://www.a.com/x/#top", excerpt: "dupe" },
        ],
      }),
    );
    await runResearch("owner", "widgets", { now: new Date("2026-09-07") });
    expect(db.researchSource.create).toHaveBeenCalledTimes(1);
  });

  it("marks the run FAILED and rethrows when the provider errors", async () => {
    const { ResearchError } = await import("./types");
    provider.search.mockRejectedValue(new ResearchError("auth", "bad key"));
    await expect(
      runResearch("owner", "widgets", { now: new Date("2026-09-07") }),
    ).rejects.toThrow();
    expect(db.researchRun.update).toHaveBeenCalledWith(
      expect.objectContaining({ data: expect.objectContaining({ status: "FAILED" }) }),
    );
  });

  it("rate-limits a rapid second run", async () => {
    db.researchRun.findFirst.mockResolvedValue({ createdAt: new Date("2026-09-07T00:00:00Z") });
    const { RateLimitedError } = await import("./service");
    await expect(
      runResearch("owner", "widgets", { now: new Date("2026-09-07T00:00:02Z") }),
    ).rejects.toBeInstanceOf(RateLimitedError);
  });
});

describe("ownership", () => {
  beforeEach(() => {
    db.researchRun.findFirst.mockImplementation(async ({ where }) =>
      where.userId === "owner" && where.id === "run_1"
        ? {
            id: "run_1",
            userId: "owner",
            query: "q",
            provider: "tavily",
            status: "COMPLETED",
            clusters: [],
            sources: [],
            signals: [],
          }
        : null,
    );
  });

  it("lets the owner read their run", async () => {
    const { run } = await getRunDetail("owner", "run_1");
    expect(run.id).toBe("run_1");
  });

  it("refuses another user's run", async () => {
    await expect(getRunDetail("attacker", "run_1")).rejects.toBeInstanceOf(NotFoundError);
  });

  it("scopes the run query by userId", async () => {
    await getRunDetail("owner", "run_1").catch(() => undefined);
    expect(db.researchRun.findFirst).toHaveBeenCalledWith(
      expect.objectContaining({ where: expect.objectContaining({ id: "run_1", userId: "owner" }) }),
    );
  });
});

describe("saveSignalAsIdea", () => {
  it("creates an idea scoped to the user and links it to the signal", async () => {
    db.signal.findFirst.mockImplementation(async ({ where }) =>
      where.userId === "owner"
        ? {
            id: "sig_1",
            userId: "owner",
            kind: "RISING",
            evidenceKind: "DIRECT",
            summary: "s",
            detail: "d",
            sourceIds: ["src_1"],
            relevanceScore: 50,
            relevanceReasons: [],
            savedIdeaId: null,
            cluster: { title: "Topic" },
            run: { query: "q" },
          }
        : null,
    );
    db.researchSource.findMany.mockResolvedValue([
      { id: "src_1", title: "T", canonicalUrl: "https://a.com/x", publisher: "A" },
    ]);
    db.idea.create.mockImplementation(async ({ data }) => ({ id: "idea_1", ...data }));
    db.signal.update.mockResolvedValue({});

    const { ideaId } = await saveSignalAsIdea("owner", "sig_1");
    expect(ideaId).toBe("idea_1");
    expect(db.idea.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({ userId: "owner", origin: "research" }),
      }),
    );
    expect(db.signal.update).toHaveBeenCalledWith({
      where: { id: "sig_1" },
      data: { savedIdeaId: "idea_1" },
    });
  });

  it("refuses to save another user's signal", async () => {
    db.signal.findFirst.mockResolvedValue(null);
    await expect(saveSignalAsIdea("attacker", "sig_1")).rejects.toBeInstanceOf(NotFoundError);
  });
});
