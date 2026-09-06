import type { Metadata } from "next";
import Link from "next/link";
import { ButtonLink, Card, EmptyState } from "@/components/ui/primitives";
import { StateBadge } from "@/components/content/StateBadge";
import { requireUser } from "@/server/auth";
import { listDrafts } from "@/server/content/service";

export const metadata: Metadata = { title: "Drafts" };

function formatDate(d: Date): string {
  return new Intl.DateTimeFormat("en-US", { dateStyle: "medium" }).format(d);
}

export default async function DraftsPage() {
  const user = await requireUser();
  const drafts = await listDrafts(user.id);

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Drafts</h1>
          <p className="text-fg-muted mt-1 text-sm">
            Everything you are working on, across the pipeline.
          </p>
        </div>
        <ButtonLink href="/drafts/new">New draft</ButtonLink>
      </div>

      {drafts.length === 0 ? (
        <EmptyState title="No drafts yet">
          Create your first draft to see it move through quality checks and approval.
        </EmptyState>
      ) : (
        <ul className="flex flex-col gap-3">
          {drafts.map((d) => (
            <li key={d.id}>
              <Card className="flex items-center justify-between gap-4">
                <div className="min-w-0">
                  <Link
                    href={`/drafts/${d.id}`}
                    className="font-medium underline-offset-4 hover:underline"
                  >
                    {d.title}
                  </Link>
                  <p className="text-fg-muted mt-0.5 text-xs">
                    Updated {formatDate(d.updatedAt)}
                    {d.publishedAt ? ` · published ${formatDate(d.publishedAt)}` : ""}
                  </p>
                </div>
                <StateBadge state={d.state} />
              </Card>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
