import { PIPELINE_STAGES, PIPELINE_STAGE_META } from "@/lib/pipeline";
import { site } from "@/config/site";

export default function HomePage() {
  return (
    <div className="flex flex-col gap-12">
      <section className="flex flex-col gap-4">
        <p className="border-border bg-surface text-fg-muted inline-flex w-fit rounded-full border px-3 py-1 text-xs font-medium">
          Phase 0 · Foundation
        </p>
        <h1 className="max-w-2xl text-4xl font-semibold tracking-tight sm:text-5xl">
          {site.tagline}
        </h1>
        <p className="text-fg-muted max-w-2xl text-lg">{site.description}</p>
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
            return (
              <li
                key={stage}
                className="border-border bg-surface flex flex-col gap-1 rounded-lg border p-4"
              >
                <div className="flex items-center gap-2">
                  <span className="text-fg-muted font-mono text-xs">
                    {String(index + 1).padStart(2, "0")}
                  </span>
                  <span className="font-medium">{meta.title}</span>
                  {meta.humanGate && (
                    <span className="bg-reach/15 text-reach rounded px-1.5 py-0.5 text-[10px] font-semibold uppercase">
                      Human gate
                    </span>
                  )}
                </div>
                <p className="text-fg-muted text-sm">{meta.summary}</p>
              </li>
            );
          })}
        </ol>
      </section>

      <section className="border-border bg-surface text-fg-muted rounded-lg border p-5 text-sm">
        <p>
          This is the Step 1 foundation shell. No integrations are connected and no content is
          published. External publishing will always pass through an explicit user approval step —
          see <code className="font-mono">SECURITY.md</code>.
        </p>
      </section>
    </div>
  );
}
