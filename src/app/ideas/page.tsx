import type { Metadata } from "next";
import Link from "next/link";
import { Badge, Card, EmptyState } from "@/components/ui/primitives";
import { requireUser } from "@/server/auth";
import { listIdeas } from "@/server/research";

export const metadata: Metadata = { title: "Ideas" };

export default async function IdeasPage() {
  const user = await requireUser();
  const ideas = await listIdeas(user.id);

  return (
    <div className="flex max-w-3xl flex-col gap-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Ideas</h1>
        <p className="text-fg-muted mt-1 text-sm">
          Content ideas saved from research. Open one to see its angle and sources before you draft.
        </p>
      </div>

      {ideas.length === 0 ? (
        <EmptyState title="No ideas yet">
          Run a search on the{" "}
          <Link href="/research" className="text-signal underline underline-offset-2">
            Research
          </Link>{" "}
          page and save a signal as an idea.
        </EmptyState>
      ) : (
        <ul className="flex flex-col gap-3">
          {ideas.map((idea) => (
            <li key={idea.id}>
              <Card className="flex flex-wrap items-center justify-between gap-3">
                <div className="min-w-0">
                  <Link
                    href={`/ideas/${idea.id}`}
                    className="font-medium underline-offset-4 hover:underline"
                  >
                    {idea.title}
                  </Link>
                  <p className="text-fg-muted mt-0.5 text-xs">
                    {new Intl.DateTimeFormat("en-GB", { dateStyle: "medium" }).format(
                      idea.createdAt,
                    )}
                    {idea.sourceUrls.length > 0
                      ? ` · ${idea.sourceUrls.length} source${idea.sourceUrls.length === 1 ? "" : "s"}`
                      : ""}
                    {" · from "}
                    {idea.origin}
                  </p>
                </div>
                <Badge tone="neutral">{idea.status.toLowerCase().replace("_", " ")}</Badge>
              </Card>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
