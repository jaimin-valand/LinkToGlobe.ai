import type { Metadata } from "next";
import Link from "next/link";
import { Badge, Card, EmptyState } from "@/components/ui/primitives";
import { requireUser } from "@/server/auth";
import { getKnowledge } from "@/server/knowledge/service";
import { listRuns, researchConfigState } from "@/server/research";
import { SearchForm } from "./SearchForm";

export const metadata: Metadata = { title: "Research" };

function fmt(d: Date): string {
  return new Intl.DateTimeFormat("en-GB", { dateStyle: "medium", timeStyle: "short" }).format(d);
}

const STATUS_TONE = {
  COMPLETED: "green",
  RUNNING: "signal",
  PENDING: "neutral",
  FAILED: "red",
} as const;

export default async function ResearchPage() {
  const user = await requireUser();
  const [config, runs, knowledge] = await Promise.all([
    Promise.resolve(researchConfigState()),
    listRuns(user.id),
    getKnowledge(user.id),
  ]);

  return (
    <div className="flex max-w-3xl flex-col gap-8">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Research</h1>
        <p className="text-fg-muted mt-1 text-sm">
          Search a licensed provider, group the coverage, and pull out signals that are relevant to
          your knowledge. Nothing is fabricated; every signal links back to its sources.
        </p>
      </div>

      <SearchForm configured={config.configured} />

      {config.fixture && (
        <Card className="border-reach/40">
          <p className="text-sm">
            <span className="font-medium">Fixture provider active.</span>{" "}
            <span className="text-fg-muted">
              <code className="font-mono">RESEARCH_PROVIDER=fixture</code> returns deterministic
              placeholder results for development and tests. This is not real research and is
              disabled in production.
            </span>
          </p>
        </Card>
      )}

      {knowledge && (knowledge.topics.length > 0 || knowledge.headline) && (
        <p className="text-fg-muted text-xs">
          Scoring against your knowledge:{" "}
          {knowledge.headline ? <span>{knowledge.headline}. </span> : null}
          {knowledge.topics.length > 0 ? (
            <span>Topics: {knowledge.topics.join(", ")}.</span>
          ) : null}{" "}
          <Link href="/knowledge" className="text-signal underline underline-offset-2">
            Edit
          </Link>
        </p>
      )}

      {!config.configured && (
        <Card className="flex flex-col gap-2">
          <div className="flex items-center gap-2">
            <h2 className="font-medium">Research provider not configured</h2>
            <Badge tone="neutral">Not configured</Badge>
          </div>
          {config.unknownProvider ? (
            <p className="text-fg-muted text-sm">
              <code className="font-mono">RESEARCH_PROVIDER={config.provider}</code> is set to a
              provider this build does not support. Supported:{" "}
              <code className="font-mono">tavily</code>.
            </p>
          ) : (
            <p className="text-fg-muted text-sm">
              Set{" "}
              {config.missingEnv.map((k, i) => (
                <span key={k}>
                  {i > 0 && " and "}
                  <code className="font-mono">{k}</code>
                </span>
              ))}{" "}
              in <code className="font-mono">.env</code>. For example{" "}
              <code className="font-mono">RESEARCH_PROVIDER=tavily</code> and a{" "}
              <code className="font-mono">RESEARCH_API_KEY</code> from tavily.com.
            </p>
          )}
          <p className="text-fg-muted text-xs">
            The key is read on the server only and is never sent to the browser. See{" "}
            <Link
              href="/settings/integrations"
              className="text-signal underline underline-offset-2"
            >
              Integrations
            </Link>
            .
          </p>
        </Card>
      )}

      <section className="flex flex-col gap-3">
        <h2 className="text-fg-muted text-sm font-semibold tracking-wide uppercase">Recent runs</h2>
        {runs.length === 0 ? (
          <EmptyState title="No research yet">
            {config.configured
              ? "Run a search to see sources, clusters, and signals here."
              : "Configure a provider, then run a search."}
          </EmptyState>
        ) : (
          <ul className="flex flex-col gap-2">
            {runs.map((r) => (
              <li key={r.id}>
                <Card className="flex flex-wrap items-center justify-between gap-3">
                  <div className="min-w-0">
                    <Link
                      href={`/research/${r.id}`}
                      className="font-medium underline-offset-4 hover:underline"
                    >
                      {r.query}
                    </Link>
                    <p className="text-fg-muted mt-0.5 text-xs">
                      {fmt(r.createdAt)} · {r.provider} · {r.sourceCount} sources · {r.clusterCount}{" "}
                      clusters · {r.signalCount} signals
                    </p>
                  </div>
                  <Badge tone={STATUS_TONE[r.status]}>{r.status.toLowerCase()}</Badge>
                </Card>
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}
