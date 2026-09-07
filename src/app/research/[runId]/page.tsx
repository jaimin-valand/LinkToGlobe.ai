import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Badge, Card } from "@/components/ui/primitives";
import { requireUser } from "@/server/auth";
import { getRunDetail, NotFoundError } from "@/server/research";
import type { ResearchSource } from "@/generated/prisma";
import { SaveIdeaButton } from "./SaveIdeaButton";

export const metadata: Metadata = { title: "Research run" };

function fmtDate(d: Date | null): string {
  return d ? new Intl.DateTimeFormat("en-GB", { dateStyle: "medium" }).format(d) : "";
}

function hostname(url: string): string {
  try {
    return new URL(url).hostname.replace(/^www\./, "");
  } catch {
    return url;
  }
}

const SIGNAL_TONE = {
  RISING: "signal",
  RECURRING: "neutral",
  UNUSUAL: "reach",
  CHANGE: "green",
  GAP: "reach",
} as const;

const SIGNAL_LABEL: Record<string, string> = {
  RISING: "Gaining attention",
  RECURRING: "Recurring point",
  UNUSUAL: "Outlier",
  CHANGE: "Newly reported",
  GAP: "Gap in coverage",
};

interface RelevanceReasonView {
  label: string;
  points: number;
  detail: string;
}

function SourceRow({ source }: { source: ResearchSource }) {
  return (
    <Card className="flex flex-col gap-1">
      <div className="flex flex-wrap items-baseline gap-2">
        <a
          href={source.canonicalUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="font-medium underline-offset-2 hover:underline"
        >
          {source.title}
        </a>
        {source.relevanceScore !== null && (
          <span className="text-fg-muted text-xs">relevance {source.relevanceScore}/100</span>
        )}
      </div>
      <p className="text-fg-muted text-xs">
        {source.publisher ?? hostname(source.canonicalUrl)}
        {source.author ? ` · ${source.author}` : ""}
        {source.publishedAt ? ` · ${fmtDate(source.publishedAt)}` : ""}
      </p>
      {source.excerpt && <p className="text-fg-muted text-sm">{source.excerpt}</p>}
    </Card>
  );
}

export default async function RunDetailPage({ params }: { params: Promise<{ runId: string }> }) {
  const user = await requireUser();
  const { runId } = await params;

  let data;
  try {
    data = await getRunDetail(user.id, runId);
  } catch (err) {
    if (err instanceof NotFoundError) notFound();
    throw err;
  }
  const { run, opportunities } = data;

  const sourcesByCluster = new Map<string | null, ResearchSource[]>();
  for (const s of run.sources) {
    const list = sourcesByCluster.get(s.clusterId) ?? [];
    list.push(s);
    sourcesByCluster.set(s.clusterId, list);
  }

  return (
    <div className="mx-auto flex max-w-3xl flex-col gap-8">
      <div className="flex flex-col gap-2">
        <Link href="/research" className="text-fg-muted text-sm underline-offset-2 hover:underline">
          ← Research
        </Link>
        <h1 className="text-2xl font-semibold tracking-tight">{run.query}</h1>
        <p className="text-fg-muted flex flex-wrap items-center gap-2 text-sm">
          <span>
            {new Intl.DateTimeFormat("en-GB", { dateStyle: "medium", timeStyle: "short" }).format(
              run.createdAt,
            )}
          </span>
          <span>· {run.provider} ·</span>
          <Badge
            tone={
              run.status === "COMPLETED" ? "green" : run.status === "FAILED" ? "red" : "neutral"
            }
          >
            {run.status.toLowerCase()}
          </Badge>
        </p>
        {run.status === "FAILED" && run.error && (
          <p role="alert" className="text-sm text-red-600">
            {run.error}
          </p>
        )}
      </div>

      {run.status === "COMPLETED" && run.sources.length === 0 && (
        <Card>
          <p className="text-fg-muted text-sm">
            The provider returned no usable sources for this search. Try different wording.
          </p>
        </Card>
      )}

      {opportunities.length > 0 && (
        <section className="flex flex-col gap-3">
          <h2 className="text-fg-muted text-sm font-semibold tracking-wide uppercase">
            Signals ({opportunities.length})
          </h2>
          <div className="flex flex-col gap-3">
            {opportunities.map(({ signal, opportunity }) => {
              const reasons = Array.isArray(signal.relevanceReasons)
                ? (signal.relevanceReasons as unknown as RelevanceReasonView[])
                : [];
              return (
                <Card key={signal.id} className="flex flex-col gap-3">
                  <div className="flex flex-wrap items-center gap-2">
                    <Badge tone={SIGNAL_TONE[signal.kind]}>{SIGNAL_LABEL[signal.kind]}</Badge>
                    <Badge tone={signal.evidenceKind === "INFERENCE" ? "reach" : "neutral"}>
                      {signal.evidenceKind === "INFERENCE" ? "Inference" : "Direct"}
                    </Badge>
                    {signal.relevanceScore !== null && (
                      <Badge tone="signal">Relevance {signal.relevanceScore}/100</Badge>
                    )}
                  </div>

                  <p className="font-medium">{signal.summary}</p>
                  <p className="text-fg-muted text-sm">{signal.detail}</p>

                  <div className="text-fg-muted flex flex-col gap-1 text-sm">
                    <p>
                      <span className="text-fg font-medium">Why this matters to you:</span>{" "}
                      {opportunity.userRelevance}
                    </p>
                    <p>
                      <span className="text-fg font-medium">Possible angle:</span>{" "}
                      {opportunity.suggestedAngle}
                    </p>
                    <p className="text-xs">
                      Confidence {opportunity.confidence}/100 (heuristic).{" "}
                      {opportunity.isInference
                        ? "This signal is an inference; bring your own evidence."
                        : ""}
                    </p>
                  </div>

                  {reasons.length > 0 && (
                    <details className="text-fg-muted text-xs">
                      <summary className="cursor-pointer">
                        How the relevance score is made up
                      </summary>
                      <ul className="mt-1 list-disc pl-5">
                        {reasons.map((r, i) => (
                          <li key={i}>
                            +{r.points} {r.label.toLowerCase()} — {r.detail}
                          </li>
                        ))}
                      </ul>
                    </details>
                  )}

                  {opportunity.sources.length > 0 && (
                    <div className="text-sm">
                      <p className="text-fg-muted text-xs">Based on:</p>
                      <ul className="mt-1 flex flex-col gap-1">
                        {opportunity.sources.map((s) => (
                          <li key={s.id}>
                            <a
                              href={s.url}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="text-signal underline underline-offset-2"
                            >
                              {s.title}
                            </a>
                            {s.publisher ? (
                              <span className="text-fg-muted"> — {s.publisher}</span>
                            ) : null}
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}

                  <SaveIdeaButton
                    signalId={signal.id}
                    runId={run.id}
                    savedIdeaId={signal.savedIdeaId}
                  />
                </Card>
              );
            })}
          </div>
        </section>
      )}

      {run.clusters.length > 0 && (
        <section className="flex flex-col gap-3">
          <h2 className="text-fg-muted text-sm font-semibold tracking-wide uppercase">
            Sources ({run.sources.length}) in {run.clusters.length}{" "}
            {run.clusters.length === 1 ? "cluster" : "clusters"}
          </h2>
          <div className="flex flex-col gap-4">
            {run.clusters.map((cluster) => (
              <div key={cluster.id} className="flex flex-col gap-2">
                <p className="text-sm font-medium">
                  {cluster.title}{" "}
                  <span className="text-fg-muted font-normal">
                    ({cluster.size} {cluster.size === 1 ? "source" : "sources"})
                  </span>
                </p>
                <div className="flex flex-col gap-2">
                  {(sourcesByCluster.get(cluster.id) ?? []).map((s) => (
                    <SourceRow key={s.id} source={s} />
                  ))}
                </div>
              </div>
            ))}
            {(sourcesByCluster.get(null) ?? []).length > 0 && (
              <div className="flex flex-col gap-2">
                <p className="text-fg-muted text-sm font-medium">Ungrouped</p>
                {(sourcesByCluster.get(null) ?? []).map((s) => (
                  <SourceRow key={s.id} source={s} />
                ))}
              </div>
            )}
          </div>
        </section>
      )}
    </div>
  );
}
