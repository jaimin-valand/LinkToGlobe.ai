import type { Metadata } from "next";
import { Card, EmptyState } from "@/components/ui/primitives";
import { StateBadge } from "@/components/content/StateBadge";
import { requireUser } from "@/server/auth";
import { getAnalytics, recentActivity } from "@/server/analytics/service";
import { STATE_LABELS } from "@/server/content/state";

export const metadata: Metadata = { title: "Analytics" };

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
          Real counts from your workspace. Published-content performance (views, engagement) needs
          an external destination and arrives in Phase 3 & 4 — there is deliberately no placeholder
          data for it.
        </p>
      </div>

      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <Stat label="Total drafts" value={String(summary.totalDrafts)} />
        <Stat label="Published" value={String(summary.published)} />
        <Stat
          label="Approval rate"
          value={summary.approvalRate === null ? "—" : `${Math.round(summary.approvalRate * 100)}%`}
        />
        <Stat
          label="Avg time to approve"
          value={
            summary.avgHoursToApprove === null ? "—" : `${summary.avgHoursToApprove.toFixed(1)} h`
          }
        />
      </div>

      <section className="flex flex-col gap-3">
        <h2 className="text-fg-muted text-sm font-semibold tracking-wide uppercase">By state</h2>
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
          Pipeline coverage: {summary.stagesImplemented} of {summary.stagesTotal} stages
          implemented.
        </p>
      </section>

      <section className="flex flex-col gap-3">
        <h2 className="text-fg-muted text-sm font-semibold tracking-wide uppercase">
          Recent activity
        </h2>
        {activity.length === 0 ? (
          <EmptyState title="No activity yet" />
        ) : (
          <Card>
            <ul className="flex flex-col gap-2 text-sm">
              {activity.map((a) => (
                <li key={a.id} className="flex items-center justify-between gap-4">
                  <span>
                    <span className="text-fg-muted font-mono text-xs">{a.action}</span>
                    {a.draft?.title ? (
                      <span className="text-fg-muted"> · {a.draft.title}</span>
                    ) : null}
                  </span>
                  <span className="text-fg-muted shrink-0 text-xs">
                    {new Intl.DateTimeFormat("en-US", {
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
