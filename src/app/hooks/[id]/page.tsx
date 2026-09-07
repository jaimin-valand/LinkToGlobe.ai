import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Badge, Card, EmptyState } from "@/components/ui/primitives";
import { requireUser } from "@/server/auth";
import { getLabView, HookLabError, type HookCandidateView } from "@/server/hooks";
import { GenerateHooksButton } from "./GenerateHooksButton";
import { AddHookForm } from "./AddHookForm";
import { CandidateActions } from "./CandidateActions";
import { ClearSelectionButton } from "./ClearSelectionButton";

export const metadata: Metadata = { title: "Hook Lab" };

type Sort = "relevance" | "clarity" | "distinct" | "recent";
const SORTS: Array<{ value: Sort; label: string }> = [
  { value: "relevance", label: "Relevance" },
  { value: "clarity", label: "Clarity" },
  { value: "distinct", label: "Most different" },
  { value: "recent", label: "Newest" },
];

function sortCandidates(list: HookCandidateView[], sort: Sort): HookCandidateView[] {
  const copy = [...list];
  switch (sort) {
    case "relevance":
      return copy.sort(
        (a, b) => b.relevanceScore - a.relevanceScore || b.clarityScore - a.clarityScore,
      );
    case "clarity":
      return copy.sort(
        (a, b) => b.clarityScore - a.clarityScore || b.relevanceScore - a.relevanceScore,
      );
    case "distinct":
      return copy.sort((a, b) => b.distinctScore - a.distinctScore);
    case "recent":
      return copy.sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());
  }
}

const GRADE_TONE: Record<string, "green" | "signal" | "reach"> = {
  clear: "green",
  okay: "signal",
  dense: "reach",
};

function CandidateCard({ candidate, ideaId }: { candidate: HookCandidateView; ideaId: string }) {
  return (
    <Card className="flex flex-col gap-3">
      <div className="flex flex-wrap items-center gap-2">
        <Badge tone="neutral">{candidate.strategyLabel}</Badge>
        <Badge tone={candidate.source === "AI" ? "signal" : "neutral"}>
          {candidate.source === "AI" ? "AI draft" : "Yours"}
        </Badge>
        {candidate.isSelected && <Badge tone="green">Selected</Badge>}
        {candidate.nearDuplicate && <Badge tone="reach">Near-duplicate</Badge>}
      </div>

      <p className="text-lg leading-snug font-medium">{candidate.text}</p>

      <dl className="text-fg-muted flex flex-wrap gap-x-6 gap-y-1 text-sm">
        <div className="flex items-baseline gap-1.5">
          <dt>Relevance</dt>
          <dd className="text-fg font-medium">{candidate.relevanceScore}/100</dd>
        </div>
        <div className="flex items-baseline gap-1.5">
          <dt>Clarity</dt>
          <dd className="text-fg font-medium">
            {candidate.clarityScore}/100{" "}
            <Badge tone={GRADE_TONE[candidate.clarityGrade] ?? "neutral"}>
              {candidate.clarityGrade}
            </Badge>
          </dd>
        </div>
        <div className="flex items-baseline gap-1.5">
          <dt>Different from the rest</dt>
          <dd className="text-fg font-medium">{candidate.distinctScore}/100</dd>
        </div>
        <div className="flex items-baseline gap-1.5">
          <dt>Length</dt>
          <dd className="text-fg font-medium">{candidate.wordCount} words</dd>
        </div>
      </dl>

      {candidate.warnings.length > 0 && (
        <ul className="flex flex-col gap-1 text-sm text-amber-700 dark:text-amber-400">
          {candidate.warnings.map((w) => (
            <li key={w.code}>{w.message}</li>
          ))}
        </ul>
      )}

      {candidate.relevanceOverlap.length > 0 && (
        <p className="text-fg-muted text-xs">
          Picks up from the idea: {candidate.relevanceOverlap.join(", ")}
        </p>
      )}

      {candidate.clarityNotes.some((n) => n.status === "warn") && (
        <details className="text-fg-muted text-xs">
          <summary className="cursor-pointer">Clarity notes</summary>
          <ul className="mt-1 list-disc pl-5">
            {candidate.clarityNotes.map((n, i) => (
              <li
                key={i}
                className={n.status === "warn" ? "text-amber-700 dark:text-amber-400" : ""}
              >
                {n.label}: {n.detail}
              </li>
            ))}
          </ul>
        </details>
      )}

      <CandidateActions
        candidateId={candidate.id}
        ideaId={ideaId}
        isSelected={candidate.isSelected}
      />
    </Card>
  );
}

export default async function HookLabPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ sort?: string }>;
}) {
  const user = await requireUser();
  const { id } = await params;
  const { sort: sortParam } = await searchParams;
  const sort: Sort = SORTS.some((s) => s.value === sortParam) ? (sortParam as Sort) : "relevance";

  let view;
  try {
    view = await getLabView(user.id, id);
  } catch (err) {
    if (err instanceof HookLabError && err.code === "not_found") notFound();
    throw err;
  }

  const { idea, candidates, aiEnabled, selectedId } = view;
  const selected = candidates.find((c) => c.id === selectedId) ?? null;
  const ordered = sortCandidates(candidates, sort);

  const best = candidates.length
    ? {
        relevance: Math.max(...candidates.map((c) => c.relevanceScore)),
        clarity: Math.max(...candidates.map((c) => c.clarityScore)),
      }
    : null;

  return (
    <div className="mx-auto flex max-w-3xl flex-col gap-8">
      <div className="flex flex-col gap-2">
        <Link
          href={`/ideas/${idea.id}`}
          className="text-fg-muted text-sm underline-offset-2 hover:underline"
        >
          ← Back to the idea
        </Link>
        <h1 className="text-2xl font-semibold tracking-tight">Hook Lab</h1>
        <p className="text-fg-muted text-sm">
          Work out the opening line for <span className="text-fg font-medium">{idea.title}</span>.
          {idea.angle ? ` Angle: ${idea.angle}` : ""}
        </p>
      </div>

      <section aria-label="Add hook candidates" className="flex flex-col gap-4">
        {aiEnabled ? (
          <GenerateHooksButton ideaId={idea.id} hasCandidates={candidates.length > 0} />
        ) : (
          <Card>
            <p className="text-sm">
              AI generation is off. Set an AI provider in{" "}
              <Link
                href="/settings/integrations"
                className="text-signal underline underline-offset-2"
              >
                Integrations
              </Link>
              , or write candidates yourself below.
            </p>
          </Card>
        )}
        <AddHookForm ideaId={idea.id} />
      </section>

      {selected && (
        <section
          aria-label="Selected hook"
          className="border-reach/40 bg-reach/5 flex flex-col gap-2 rounded-lg border p-5"
        >
          <p className="text-fg-muted text-xs tracking-wide uppercase">Selected hook</p>
          <p className="text-lg font-medium">{selected.text}</p>
          <p className="text-fg-muted text-sm">
            {selected.strategyLabel} · relevance {selected.relevanceScore}/100 · clarity{" "}
            {selected.clarityScore}/100
          </p>
          <div className="mt-1 flex flex-wrap items-center gap-3">
            {view.draft ? (
              <Link
                href={`/drafts/${view.draft.id}`}
                className="text-signal text-sm underline underline-offset-2"
              >
                Open the draft
              </Link>
            ) : (
              <Link
                href={`/ideas/${idea.id}`}
                className="text-signal text-sm underline underline-offset-2"
              >
                Turn the idea into a draft
              </Link>
            )}
            <ClearSelectionButton ideaId={idea.id} />
          </div>
        </section>
      )}

      {candidates.length === 0 ? (
        <EmptyState title="No candidates yet">
          {aiEnabled
            ? "Generate a set with AI, or write your own above. Each one is scored for relevance to the idea, clarity, and how different it is from the others."
            : "Write a few opening lines above. Each one is scored for relevance to the idea, clarity, and how different it is from the others."}
        </EmptyState>
      ) : (
        <section aria-label="Hook candidates" className="flex flex-col gap-4">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <h2 className="text-fg-muted text-sm font-semibold tracking-wide uppercase">
              {candidates.length} {candidates.length === 1 ? "candidate" : "candidates"}
              {best ? ` · best relevance ${best.relevance}, best clarity ${best.clarity}` : ""}
            </h2>
            <nav aria-label="Sort candidates" className="flex flex-wrap gap-1.5 text-sm">
              {SORTS.map((s) => {
                const active = s.value === sort;
                return (
                  <Link
                    key={s.value}
                    href={
                      s.value === "relevance"
                        ? `/hooks/${idea.id}`
                        : `/hooks/${idea.id}?sort=${s.value}`
                    }
                    aria-current={active ? "true" : undefined}
                    className={
                      active
                        ? "bg-signal text-signal-fg rounded-md px-2.5 py-1 font-medium"
                        : "border-border text-fg-muted hover:bg-bg rounded-md border px-2.5 py-1"
                    }
                  >
                    {s.label}
                  </Link>
                );
              })}
            </nav>
          </div>

          <ul className="flex flex-col gap-4">
            {ordered.map((c) => (
              <li key={c.id}>
                <CandidateCard candidate={c} ideaId={idea.id} />
              </li>
            ))}
          </ul>
        </section>
      )}
    </div>
  );
}
