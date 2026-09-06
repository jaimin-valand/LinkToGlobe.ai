import Link from "next/link";
import { ButtonLink } from "@/components/ui/primitives";
import { PIPELINE_STAGES, PIPELINE_STAGE_META, type PipelineStage } from "@/lib/pipeline";
import { site } from "@/config/site";
import { getCurrentUser } from "@/server/auth";

const STAGE_LINK: Partial<Record<PipelineStage, string>> = {
  USER_KNOWLEDGE: "/knowledge",
  CONTENT: "/drafts",
  QUALITY_REVIEW: "/drafts",
  USER_APPROVAL: "/approvals",
};

export default async function HomePage() {
  const user = await getCurrentUser().catch(() => null);

  return (
    <div className="flex flex-col gap-12">
      <section className="flex flex-col gap-4">
        <p className="border-border bg-surface text-fg-muted inline-flex w-fit rounded-full border px-3 py-1 text-xs font-medium">
          Phase 1
        </p>
        <h1 className="max-w-2xl text-4xl font-semibold tracking-tight sm:text-5xl">
          {site.tagline}
        </h1>
        <p className="text-fg-muted max-w-2xl text-lg">{site.description}</p>
        <div className="flex flex-wrap gap-3 pt-1">
          {user ? (
            <>
              <ButtonLink href="/drafts">Open your drafts</ButtonLink>
              <ButtonLink href="/knowledge" variant="secondary">
                Edit your knowledge
              </ButtonLink>
            </>
          ) : (
            <ButtonLink href="/login">Sign in</ButtonLink>
          )}
        </div>
      </section>

      <section aria-labelledby="pipeline-heading" className="flex flex-col gap-4">
        <h2
          id="pipeline-heading"
          className="text-fg-muted text-sm font-semibold tracking-wide uppercase"
        >
          The pipeline
        </h2>
        <ol className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {PIPELINE_STAGES.map((stage, index) => {
            const meta = PIPELINE_STAGE_META[stage];
            const working = Boolean(STAGE_LINK[stage]);
            const href = user ? STAGE_LINK[stage] : undefined;
            const inner = (
              <>
                <div className="flex flex-wrap items-center gap-2">
                  <span className="text-fg-muted font-mono text-xs">
                    {String(index + 1).padStart(2, "0")}
                  </span>
                  <span className="font-medium">{meta.title}</span>
                  {meta.humanGate && (
                    <span className="bg-reach/15 text-reach rounded px-1.5 py-0.5 text-[10px] font-semibold uppercase">
                      You decide
                    </span>
                  )}
                  <span
                    className={
                      working
                        ? "rounded bg-green-100 px-1.5 py-0.5 text-[10px] font-semibold text-green-800 uppercase dark:bg-green-950/50 dark:text-green-300"
                        : "bg-bg text-fg-muted rounded px-1.5 py-0.5 text-[10px] font-semibold uppercase"
                    }
                  >
                    {working ? "Working" : "Not built yet"}
                  </span>
                </div>
                <p className="text-fg-muted text-sm">{meta.summary}</p>
              </>
            );
            return (
              <li key={stage}>
                {href ? (
                  <Link
                    href={href}
                    className="border-border bg-surface hover:border-signal/50 flex h-full flex-col gap-1 rounded-lg border p-4 transition-colors"
                  >
                    {inner}
                  </Link>
                ) : (
                  <div className="border-border bg-surface flex h-full flex-col gap-1 rounded-lg border p-4">
                    {inner}
                  </div>
                )}
              </li>
            );
          })}
        </ol>
      </section>

      <section className="border-border bg-surface text-fg-muted rounded-lg border p-5 text-sm">
        <p>
          What works now: writing your knowledge, drafting content, automated quality checks, and an
          approval step you control before anything counts as published. Research, signals,
          scheduling, publishing to other platforms, and the analytics loop are not built yet. When
          publishing to other platforms is added it will still need your approval first. See{" "}
          <code className="font-mono">SECURITY.md</code>.
        </p>
      </section>
    </div>
  );
}
