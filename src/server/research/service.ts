import "server-only";
import { prisma } from "@/lib/db";
import type { Prisma } from "@/generated/prisma";
import { getKnowledge } from "@/server/knowledge/service";
import { requireResearchProvider } from "./provider";
import { cleanSources } from "./normalise";
import { urlHash } from "./url";
import { clusterSources } from "./cluster";
import { scoreRelevance, type RelevanceReason } from "./relevance";
import { extractSignals, type ClusterView, type SignalSourceView } from "./signals";
import { toOpportunity, type OpportunitySignal } from "./opportunity";
import { ResearchError, safeMessageFor } from "./types";

export { ResearchError } from "./types";
export class NotFoundError extends Error {
  constructor(msg = "Not found.") {
    super(msg);
    this.name = "NotFoundError";
  }
}

// Cheap, deterministic rate limiting backed by the run table.
const MIN_INTERVAL_MS = 8_000;
const MAX_RUNS_PER_HOUR = 30;
const MAX_QUERY_LEN = 200;
const MIN_QUERY_LEN = 3;

export class RateLimitedError extends Error {
  constructor(msg: string) {
    super(msg);
    this.name = "RateLimitedError";
  }
}

async function assertWithinRateLimit(userId: string, now: Date): Promise<void> {
  const recent = await prisma.researchRun.findFirst({
    where: { userId },
    orderBy: { createdAt: "desc" },
    select: { createdAt: true },
  });
  if (recent && now.getTime() - recent.createdAt.getTime() < MIN_INTERVAL_MS) {
    throw new RateLimitedError("You just ran a search. Wait a few seconds and try again.");
  }
  const hourAgo = new Date(now.getTime() - 3_600_000);
  const inLastHour = await prisma.researchRun.count({
    where: { userId, createdAt: { gte: hourAgo } },
  });
  if (inLastHour >= MAX_RUNS_PER_HOUR) {
    throw new RateLimitedError("Hourly research limit reached. Try again later.");
  }
}

export interface RunResearchResult {
  runId: string;
}

/**
 * The full slice: provider search -> normalise -> dedupe -> cluster ->
 * relevance -> signals -> persist. Throws NotConfiguredError when there is no
 * provider (the caller shows the "not configured" state).
 */
export async function runResearch(
  userId: string,
  rawQuery: string,
  opts: { now?: Date } = {},
): Promise<RunResearchResult> {
  const now = opts.now ?? new Date();
  const query = rawQuery.trim().replace(/\s+/g, " ");
  if (query.length < MIN_QUERY_LEN) throw new ResearchError("invalid", "Enter a longer search.");
  if (query.length > MAX_QUERY_LEN) throw new ResearchError("invalid", "That search is too long.");

  const provider = requireResearchProvider(); // throws NotConfiguredError
  await assertWithinRateLimit(userId, now);

  const run = await prisma.researchRun.create({
    data: { userId, query, provider: provider.id, status: "RUNNING" },
  });

  try {
    const result = await provider.search(query, { limit: 12, timeoutMs: 15_000 });
    const cleaned = cleanSources(result.sources);

    const knowledge = await getKnowledge(userId);
    const kForRel = {
      headline: knowledge?.headline ?? "",
      expertise: knowledge?.expertise ?? "",
      audience: knowledge?.audience ?? "",
      topics: knowledge?.topics ?? [],
    };

    // Score each source, keyed by canonical url (stable id within this run).
    const scored = cleaned.map((s) => {
      const rel = scoreRelevance(
        { title: s.title, excerpt: s.excerpt },
        kForRel,
        s.publishedAt,
        now,
      );
      return { ...s, relevance: rel };
    });

    // Cluster.
    const clusters = clusterSources(
      scored.map((s) => ({
        id: s.canonicalUrl,
        title: s.title,
        host: s.host,
        publishedAt: s.publishedAt,
      })),
    );

    // Signals need source views keyed by the same id (canonical url for now).
    const viewById = new Map<string, SignalSourceView>();
    for (const s of scored) {
      viewById.set(s.canonicalUrl, {
        id: s.canonicalUrl,
        title: s.title,
        excerpt: s.excerpt,
        publisher: s.publisher,
        host: s.host,
        publishedAt: s.publishedAt,
      });
    }
    const clusterViews: ClusterView[] = clusters.map((c, i) => ({
      key: `c${i}`,
      title: c.title,
      sourceIds: c.memberIds,
    }));
    const signalDrafts = extractSignals(query, clusterViews, viewById, kForRel.topics, now);

    // Persist everything in one transaction.
    await prisma.$transaction(async (tx) => {
      // Clusters first so sources can reference them.
      const clusterIdByKey = new Map<string, string>();
      for (let i = 0; i < clusters.length; i++) {
        const c = clusters[i];
        const row = await tx.storyCluster.create({
          data: {
            userId,
            runId: run.id,
            title: c.title,
            size: c.memberIds.length,
            summary:
              scored.find((s) => s.canonicalUrl === c.memberIds[0])?.excerpt.slice(0, 400) ?? "",
          },
        });
        clusterIdByKey.set(`c${i}`, row.id);
      }
      const clusterIdBySourceUrl = new Map<string, string>();
      clusters.forEach((c, i) => {
        for (const url of c.memberIds) clusterIdBySourceUrl.set(url, clusterIdByKey.get(`c${i}`)!);
      });

      // Sources (deduped by @@unique([runId, urlHash])).
      const sourceIdByUrl = new Map<string, string>();
      for (const s of scored) {
        const row = await tx.researchSource.create({
          data: {
            userId,
            runId: run.id,
            clusterId: clusterIdBySourceUrl.get(s.canonicalUrl) ?? null,
            canonicalUrl: s.canonicalUrl,
            urlHash: urlHash(s.canonicalUrl),
            title: s.title,
            publisher: s.publisher ?? null,
            author: s.author ?? null,
            publishedAt: s.publishedAt ?? null,
            excerpt: s.excerpt,
            provider: provider.id,
            providerSourceId: s.providerSourceId ?? null,
            relevanceScore: s.relevance.score,
            relevanceReasons: s.relevance.reasons as unknown as Prisma.InputJsonValue,
            metadata: (s.metadata ?? undefined) as Prisma.InputJsonValue | undefined,
          },
        });
        sourceIdByUrl.set(s.canonicalUrl, row.id);
      }

      // Signals: translate url-keyed sourceIds to db ids, score relevance.
      for (const d of signalDrafts) {
        const dbSourceIds = d.sourceIds
          .map((u) => sourceIdByUrl.get(u))
          .filter((v): v is string => !!v);
        const memberScores = d.sourceIds
          .map((u) => scored.find((s) => s.canonicalUrl === u)?.relevance)
          .filter((r): r is { score: number; reasons: RelevanceReason[] } => !!r);
        const best =
          memberScores.length > 0
            ? memberScores.reduce((a, b) => (b.score > a.score ? b : a))
            : null;
        await tx.signal.create({
          data: {
            userId,
            runId: run.id,
            clusterId: d.clusterKey ? (clusterIdByKey.get(d.clusterKey) ?? null) : null,
            kind: d.kind,
            evidenceKind: d.evidenceKind,
            summary: d.summary,
            detail: d.detail,
            sourceIds: dbSourceIds,
            relevanceScore: best?.score ?? null,
            relevanceReasons: (best?.reasons ?? undefined) as Prisma.InputJsonValue | undefined,
          },
        });
      }

      await tx.researchRun.update({
        where: { id: run.id },
        data: {
          status: "COMPLETED",
          completedAt: now,
          sourceCount: scored.length,
          clusterCount: clusters.length,
          signalCount: signalDrafts.length,
        },
      });
      await tx.activityLog.create({
        data: {
          userId,
          action: "research.completed",
          detail: {
            runId: run.id,
            query,
            provider: provider.id,
            sources: scored.length,
            clusters: clusters.length,
            signals: signalDrafts.length,
          },
        },
      });
    });

    return { runId: run.id };
  } catch (err) {
    const message = err instanceof ResearchError ? safeMessageFor(err) : "The research run failed.";
    // Server-side detail only.
    console.error(`[research] run ${run.id} failed:`, err);
    await prisma.researchRun
      .update({
        where: { id: run.id },
        data: { status: "FAILED", error: message, completedAt: now },
      })
      .catch(() => undefined);
    throw err instanceof ResearchError ? err : new ResearchError("provider_error", message);
  }
}

// ── Reads (all user-scoped) ────────────────────────────────────────────────

export function listRuns(userId: string, take = 20) {
  return prisma.researchRun.findMany({
    where: { userId },
    orderBy: { createdAt: "desc" },
    take,
  });
}

export async function getRunDetail(userId: string, runId: string) {
  const run = await prisma.researchRun.findFirst({
    where: { id: runId, userId },
    include: {
      clusters: { orderBy: { createdAt: "asc" } },
      sources: { orderBy: [{ relevanceScore: "desc" }, { createdAt: "asc" }] },
      signals: {
        orderBy: [{ relevanceScore: "desc" }, { createdAt: "asc" }],
        include: { savedIdea: true },
      },
    },
  });
  if (!run) throw new NotFoundError("Research run not found.");

  const sourceById = new Map(run.sources.map((s) => [s.id, s]));
  const clusterById = new Map(run.clusters.map((c) => [c.id, c]));

  const opportunities = run.signals.map((sig) => {
    const view: OpportunitySignal = {
      id: sig.id,
      kind: sig.kind,
      evidenceKind: sig.evidenceKind,
      summary: sig.summary,
      detail: sig.detail,
      relevanceScore: sig.relevanceScore,
      relevanceReasons: (sig.relevanceReasons as unknown as RelevanceReason[]) ?? null,
      clusterTitle: sig.clusterId ? (clusterById.get(sig.clusterId)?.title ?? null) : null,
      sources: sig.sourceIds
        .map((id) => sourceById.get(id))
        .filter((s): s is NonNullable<typeof s> => !!s)
        .map((s) => ({
          id: s.id,
          title: s.title,
          url: s.canonicalUrl,
          publisher: s.publisher,
        })),
    };
    return { signal: sig, opportunity: toOpportunity(view) };
  });

  return { run, opportunities };
}

export async function getRunStatus(userId: string, runId: string) {
  const run = await prisma.researchRun.findFirst({
    where: { id: runId, userId },
    select: { id: true, status: true, error: true },
  });
  if (!run) throw new NotFoundError("Research run not found.");
  return run;
}

// ── Ideas ──────────────────────────────────────────────────────────────────

export async function saveSignalAsIdea(
  userId: string,
  signalId: string,
): Promise<{ ideaId: string }> {
  const signal = await prisma.signal.findFirst({
    where: { id: signalId, userId },
    include: {
      savedIdea: true,
      cluster: true,
      run: { select: { query: true } },
    },
  });
  if (!signal) throw new NotFoundError("Signal not found.");
  if (signal.savedIdeaId) return { ideaId: signal.savedIdeaId };

  const sources = await prisma.researchSource.findMany({
    where: { userId, id: { in: signal.sourceIds } },
    select: { id: true, title: true, canonicalUrl: true, publisher: true },
  });

  const view: OpportunitySignal = {
    id: signal.id,
    kind: signal.kind,
    evidenceKind: signal.evidenceKind,
    summary: signal.summary,
    detail: signal.detail,
    relevanceScore: signal.relevanceScore,
    relevanceReasons: (signal.relevanceReasons as unknown as RelevanceReason[]) ?? null,
    clusterTitle: signal.cluster?.title ?? null,
    sources: sources.map((s) => ({
      id: s.id,
      title: s.title,
      url: s.canonicalUrl,
      publisher: s.publisher,
    })),
  };
  const opp = toOpportunity(view);

  return prisma.$transaction(async (tx) => {
    const idea = await tx.idea.create({
      data: {
        userId,
        title: opp.topic,
        angle: opp.suggestedAngle,
        notes: [
          `From research: "${signal.run.query}"`,
          `Why it matters: ${opp.whyItMatters}`,
          `Relevance to you: ${opp.userRelevance}`,
          opp.isInference ? "Note: this is an inference, not stated by a source." : null,
        ]
          .filter(Boolean)
          .join("\n\n"),
        sourceUrls: sources.map((s) => s.canonicalUrl),
        origin: "research",
      },
    });
    await tx.signal.update({ where: { id: signal.id }, data: { savedIdeaId: idea.id } });
    await tx.activityLog.create({
      data: { userId, action: "idea.saved", detail: { ideaId: idea.id, signalId: signal.id } },
    });
    return { ideaId: idea.id };
  });
}

export function listIdeas(userId: string, take = 50) {
  return prisma.idea.findMany({
    where: { userId },
    orderBy: { createdAt: "desc" },
    take,
    include: { signal: { select: { id: true, runId: true } } },
  });
}

export async function getIdea(userId: string, id: string) {
  const idea = await prisma.idea.findFirst({
    where: { id, userId },
    include: {
      signal: { select: { id: true, runId: true } },
      draft: { select: { id: true, state: true } },
      hookLab: {
        select: {
          _count: { select: { candidates: true } },
          selectedCandidate: { select: { text: true, strategy: true } },
        },
      },
    },
  });
  if (!idea) throw new NotFoundError("Idea not found.");
  return idea;
}
