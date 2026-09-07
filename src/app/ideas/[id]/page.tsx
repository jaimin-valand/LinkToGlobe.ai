import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Badge, Card } from "@/components/ui/primitives";
import { requireUser } from "@/server/auth";
import { getIdea, NotFoundError } from "@/server/research";

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

      <p className="text-fg-muted text-xs">
        Turning an idea into a draft is not wired up yet. For now, copy the angle into a{" "}
        <Link href="/drafts/new" className="text-signal underline underline-offset-2">
          new draft
        </Link>
        .
      </p>
    </div>
  );
}
