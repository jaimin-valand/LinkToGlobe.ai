import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Badge, Card } from "@/components/ui/primitives";
import { STATE_LABELS } from "@/server/content/state";
import { requireUser } from "@/server/auth";
import { getIdea, NotFoundError } from "@/server/research";
import { strategyDef } from "@/server/hooks";
import { ConvertToDraftButton } from "./ConvertToDraftButton";

export const metadata: Metadata = { title: "Idea" };

function hostname(url: string): string {
  try {
    return new URL(url).hostname.replace(/^www\./, "");
  } catch {
    return url;
  }
}

export default async function IdeaPage({ params }: { params: Promise<{ id: string }> }) {
  const user = await requireUser();
  const { id } = await params;

  let idea;
  try {
    idea = await getIdea(user.id, id);
  } catch (err) {
    if (err instanceof NotFoundError) notFound();
    throw err;
  }

  return (
    <div className="mx-auto flex max-w-2xl flex-col gap-6">
      <div className="flex flex-col gap-2">
        <Link href="/ideas" className="text-fg-muted text-sm underline-offset-2 hover:underline">
          ← Ideas
        </Link>
        <h1 className="text-2xl font-semibold tracking-tight">{idea.title}</h1>
        <div className="flex items-center gap-2">
          <Badge tone="neutral">{idea.status.toLowerCase().replace("_", " ")}</Badge>
          <span className="text-fg-muted text-xs">from {idea.origin}</span>
        </div>
      </div>

      {idea.angle && (
        <Card>
          <p className="text-fg-muted text-xs tracking-wide uppercase">Suggested angle</p>
          <p className="mt-1 text-sm">{idea.angle}</p>
        </Card>
      )}

      {idea.notes && (
        <Card>
          <p className="text-fg-muted text-xs tracking-wide uppercase">Notes</p>
          <p className="mt-1 text-sm whitespace-pre-wrap">{idea.notes}</p>
        </Card>
      )}

      {idea.sourceUrls.length > 0 && (
        <Card>
          <p className="text-fg-muted text-xs tracking-wide uppercase">Sources</p>
          <ul className="mt-1 flex flex-col gap-1 text-sm">
            {idea.sourceUrls.map((url) => (
              <li key={url}>
                <a
                  href={url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-signal underline underline-offset-2"
                >
                  {hostname(url)}
                </a>
              </li>
            ))}
          </ul>
        </Card>
      )}

      {idea.signal && (
        <p className="text-fg-muted text-sm">
          <Link
            href={`/research/${idea.signal.runId}`}
            className="text-signal underline underline-offset-2"
          >
            Back to the research run
          </Link>
        </p>
      )}

      <Card className="flex flex-col gap-3">
        <div>
          <p className="text-fg-muted text-xs tracking-wide uppercase">Hook</p>
          <p className="mt-1 text-sm">
            {idea.hookLab?.selectedCandidate
              ? "A hook is chosen for this idea."
              : "Shape the opening line before you draft. Hook Lab drafts options, scores them, and you pick one."}
          </p>
          {idea.hookLab?.selectedCandidate && (
            <p className="mt-2 text-sm">
              &ldquo;{idea.hookLab.selectedCandidate.text}&rdquo;
              <span className="text-fg-muted">
                {" "}
                · {strategyDef(idea.hookLab.selectedCandidate.strategy).label}
              </span>
            </p>
          )}
        </div>
        <p className="text-sm">
          <Link href={`/hooks/${idea.id}`} className="text-signal underline underline-offset-2">
            {idea.hookLab && idea.hookLab._count.candidates > 0
              ? "Open Hook Lab"
              : "Start the Hook Lab"}
          </Link>
          {idea.hookLab && idea.hookLab._count.candidates > 0 && (
            <span className="text-fg-muted">
              {" "}
              · {idea.hookLab._count.candidates}{" "}
              {idea.hookLab._count.candidates === 1 ? "candidate" : "candidates"}
            </span>
          )}
        </p>
      </Card>

      <Card className="flex flex-col gap-3">
        <div>
          <p className="text-fg-muted text-xs tracking-wide uppercase">Draft</p>
          <p className="mt-1 text-sm">
            {idea.draft
              ? "This idea already has a draft."
              : idea.hookLab?.selectedCandidate
                ? "Start a draft from this idea. The chosen hook and the sources carry across; you write the body."
                : "Start a draft from this idea. The angle becomes the hook and the sources carry across; you write the body."}
          </p>
        </div>
        {idea.draft ? (
          <p className="text-sm">
            <Link
              href={`/drafts/${idea.draft.id}`}
              className="text-signal underline underline-offset-2"
            >
              Open the draft
            </Link>
            <span className="text-fg-muted"> · {STATE_LABELS[idea.draft.state]}</span>
          </p>
        ) : (
          <ConvertToDraftButton ideaId={idea.id} />
        )}
      </Card>
    </div>
  );
}
