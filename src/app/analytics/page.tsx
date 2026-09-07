import type { Metadata } from "next";
import { Card, EmptyState } from "@/components/ui/primitives";
import { StateBadge } from "@/components/content/StateBadge";
import { requireUser } from "@/server/auth";
import { getAnalytics, recentActivity } from "@/server/analytics/service";
import { STATE_LABELS } from "@/server/content/state";

export const metadata: Metadata = { title: "Analytics" };

const ACTION_LABELS: Record<string, string> = {
  "draft.created": "Draft created",
  "draft.updated": "Draft edited",
  "draft.deleted": "Draft deleted",
  "draft.submitted": "Submitted for review",
  "quality.rerun": "Checks run again",
  "quality.passed": "Passed checks",
  "draft.approved": "Approved",
  "draft.published": "Published",
  "draft.rejected": "Sent back",
  "draft.returned": "Returned to draft",
  "knowledge.saved": "Knowledge updated",
  "research.completed": "Research run completed",
  "idea.saved": "Idea saved",
  "idea.converted": "Idea turned into draft",
  "hooklab.generated": "Hook candidates generated",
  "hooklab.candidate_added": "Hook candidate added",
  "hooklab.candidate_removed": "Hook candidate removed",
  "hooklab.selected": "Hook selected",
};

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <Card>
      <p className="text-fg-muted text-xs tracking-wide uppercase">{label}</p>
      <p className="mt-1 text-2xl font-semibold">{value}</p>
    </Card>
  );
}

export default async function AnalyticsPage() {
  const user = await requireUser();
  const [summary, activity] = await Promise.all([
    getAnalytics(user.id),
    recentActivity(user.id, 15),
  ]);

  return (
    <div className="flex flex-col gap-8">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Analytics</h1>
        <p className="text-fg-muted mt-1 text-sm">
          Counts from your own drafts. Reach and engagement figures need publishing to another
          platform, which is not built yet, so there is nothing shown for that.
        </p>
      </div>

      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <Stat label="Total drafts" value={String(summary.totalDrafts)} />
        <Stat label="Published" value={String(summary.published)} />
        <Stat
          label="Approval rate"
          value={
            summary.approvalRate === null ? "n/a" : `${Math.round(summary.approvalRate * 100)}%`
          }
        />
        <Stat
          label="Average time to approve"
          value={
            summary.avgHoursToApprove === null ? "n/a" : `${summary.avgHoursToApprove.toFixed(1)} h`
          }
        />
      </div>

      <section className="flex flex-col gap-3">
        <h2 className="text-fg-muted text-sm font-semibold tracking-wide uppercase">By status</h2>
        <Card>
          <ul className="flex flex-col gap-2 text-sm">
            {(Object.keys(summary.byState) as Array<keyof typeof summary.byState>).map((state) => (
              <li key={state} className="flex items-center justify-between">
                <span className="flex items-center gap-2">
                  <StateBadge state={state} />
                  <span className="text-fg-muted">{STATE_LABELS[state]}</span>
                </span>
                <span className="font-mono">{summary.byState[state]}</span>
              </li>
            ))}
          </ul>
        </Card>
        <p className="text-fg-muted text-xs">
          {summary.stagesImplemented} of the {summary.stagesTotal} pipeline stages are built.
        </p>
      </section>

      <section className="flex flex-col gap-3">
        <h2 className="text-fg-muted text-sm font-semibold tracking-wide uppercase">
          Recent activity
        </h2>
        {activity.length === 0 ? (
          <EmptyState title="Nothing yet">Your actions on drafts will show up here.</EmptyState>
        ) : (
          <Card>
            <ul className="flex flex-col gap-2 text-sm">
              {activity.map((a) => (
                <li key={a.id} className="flex items-center justify-between gap-4">
                  <span>
                    <span>{ACTION_LABELS[a.action] ?? a.action}</span>
                    {a.draft?.title ? (
                      <span className="text-fg-muted">: {a.draft.title}</span>
                    ) : null}
                  </span>
                  <span className="text-fg-muted shrink-0 text-xs">
                    {new Intl.DateTimeFormat("en-GB", {
                      dateStyle: "short",
                      timeStyle: "short",
                    }).format(a.createdAt)}
                  </span>
                </li>
              ))}
            </ul>
          </Card>
        )}
      </section>
    </div>
  );
}
