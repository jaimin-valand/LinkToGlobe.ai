import type { Metadata } from "next";
import Link from "next/link";
import { ButtonLink, Card, EmptyState } from "@/components/ui/primitives";
import { StateBadge } from "@/components/content/StateBadge";
import { requireUser } from "@/server/auth";
import { listDrafts } from "@/server/content/service";
import { STATE_LABELS } from "@/server/content/state";
import type { ContentState } from "@/generated/prisma";

export const metadata: Metadata = { title: "Drafts" };

const FILTERS: Array<{ label: string; value: ContentState | "ALL" }> = [
  { label: "All", value: "ALL" },
  { label: "Draft", value: "DRAFT" },
  { label: STATE_LABELS.QUALITY_CHECK, value: "QUALITY_CHECK" },
  { label: STATE_LABELS.USER_APPROVAL, value: "USER_APPROVAL" },
  { label: "Published", value: "PUBLISHED" },
  { label: "Rejected", value: "REJECTED" },
];

function formatDate(d: Date): string {
  return new Intl.DateTimeFormat("en-GB", { dateStyle: "medium" }).format(d);
}

export default async function DraftsPage({
  searchParams,
}: {
  searchParams: Promise<{ state?: string }>;
}) {
  const user = await requireUser();
  const { state } = await searchParams;
  const active = FILTERS.some((f) => f.value === state) ? (state as ContentState) : undefined;
  const drafts = await listDrafts(user.id, active);

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Drafts</h1>
          <p className="text-fg-muted mt-1 text-sm">Everything you are working on.</p>
        </div>
        <ButtonLink href="/drafts/new">New draft</ButtonLink>
      </div>

      <nav aria-label="Filter drafts by status" className="flex flex-wrap gap-1.5 text-sm">
        {FILTERS.map((f) => {
          const isActive = f.value === "ALL" ? !active : active === f.value;
          return (
            <Link
              key={f.value}
              href={f.value === "ALL" ? "/drafts" : `/drafts?state=${f.value}`}
              className={
                isActive
                  ? "bg-signal text-signal-fg rounded-md px-2.5 py-1 font-medium"
                  : "border-border text-fg-muted hover:bg-bg rounded-md border px-2.5 py-1"
              }
            >
              {f.label}
            </Link>
          );
        })}
      </nav>

      {drafts.length === 0 ? (
        <EmptyState title={active ? "Nothing with that status" : "No drafts yet"}>
          {active
            ? "Try a different filter, or start a new draft."
            : "Start one and it will move through checks and approval from here."}
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
                    {d.publishedAt ? `, published ${formatDate(d.publishedAt)}` : ""}
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
