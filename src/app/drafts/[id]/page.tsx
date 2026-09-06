import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { Button } from "@/components/ui/primitives";
import { StateBadge } from "@/components/content/StateBadge";
import { QualityReportView } from "@/components/content/QualityReportView";
import { requireUser } from "@/server/auth";
import { getAi } from "@/server/ai";
import { getDraftWithReports, NotFoundError } from "@/server/content/service";
import type { QualityCheck } from "@/server/quality/engine";
import {
  approveAction,
  deleteDraftAction,
  rerunQualityAction,
  returnToDraftAction,
  sendToApprovalAction,
} from "../actions";
import { DraftEditor } from "./DraftEditor";
import { RejectForm } from "./RejectForm";

export const metadata: Metadata = { title: "Draft" };

export default async function DraftPage({ params }: { params: Promise<{ id: string }> }) {
  const user = await requireUser();
  const { id } = await params;

  let draft;
  try {
    draft = await getDraftWithReports(user.id, id);
  } catch (err) {
    if (err instanceof NotFoundError) notFound();
    throw err;
  }

  const latestReport = draft.qualityReports[0];
  const reportChecks = (latestReport?.checks ?? []) as unknown as QualityCheck[];
  const aiEnabled = getAi().enabled;

  return (
    <div className="mx-auto flex max-w-2xl flex-col gap-6">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">{draft.title}</h1>
          <div className="mt-2">
            <StateBadge state={draft.state} />
          </div>
        </div>
        {draft.state !== "PUBLISHED" && (
          <form action={deleteDraftAction}>
            <input type="hidden" name="id" value={draft.id} />
            <Button type="submit" variant="ghost" className="text-red-600">
              Delete
            </Button>
          </form>
        )}
      </div>

      {draft.state === "DRAFT" && <DraftEditor draft={draft} aiEnabled={aiEnabled} />}

      {draft.state !== "DRAFT" && (
        <article className="flex flex-col gap-4">
          {draft.hook && <p className="text-lg font-medium">{draft.hook}</p>}
          <div className="border-border bg-surface rounded-lg border p-5 text-sm whitespace-pre-wrap">
            {draft.body || <span className="text-fg-muted">No body.</span>}
          </div>
          {draft.sourceNotes && (
            <details className="text-fg-muted text-sm">
              <summary className="cursor-pointer">Source notes</summary>
              <p className="mt-2 whitespace-pre-wrap">{draft.sourceNotes}</p>
            </details>
          )}
        </article>
      )}

      {draft.state === "QUALITY_CHECK" && (
        <>
          {latestReport && (
            <QualityReportView
              passed={latestReport.passed}
              score={latestReport.score}
              checks={reportChecks}
              createdAt={latestReport.createdAt}
            />
          )}
          <div className="flex flex-wrap gap-3">
            <form action={rerunQualityAction}>
              <input type="hidden" name="id" value={draft.id} />
              <Button type="submit" variant="secondary">
                Re-run checks
              </Button>
            </form>
            <form action={sendToApprovalAction}>
              <input type="hidden" name="id" value={draft.id} />
              <Button type="submit" disabled={!latestReport?.passed}>
                Send to approval
              </Button>
            </form>
            <form action={returnToDraftAction}>
              <input type="hidden" name="id" value={draft.id} />
              <Button type="submit" variant="ghost">
                Back to draft
              </Button>
            </form>
          </div>
          {!latestReport?.passed && (
            <p className="text-fg-muted text-sm">
              Fix the blocking items, go back to draft to edit, then re-submit.
            </p>
          )}
        </>
      )}

      {draft.state === "USER_APPROVAL" && (
        <div className="border-reach/40 bg-reach/5 flex flex-col gap-4 rounded-lg border p-5">
          <div>
            <h3 className="font-medium">Human approval gate</h3>
            <p className="text-fg-muted mt-0.5 text-sm">
              Approving marks this as published within LinkToGlobe and records who approved it and
              when. There is no external publishing in this version.
            </p>
          </div>
          {latestReport && (
            <QualityReportView
              passed={latestReport.passed}
              score={latestReport.score}
              checks={reportChecks}
            />
          )}
          <div className="flex flex-wrap items-start gap-3">
            <form action={approveAction}>
              <input type="hidden" name="id" value={draft.id} />
              <Button type="submit">Approve &amp; publish</Button>
            </form>
            <form action={returnToDraftAction}>
              <input type="hidden" name="id" value={draft.id} />
              <Button type="submit" variant="ghost">
                Request changes
              </Button>
            </form>
          </div>
          <RejectForm id={draft.id} />
        </div>
      )}

      {draft.state === "REJECTED" && (
        <div className="flex flex-col gap-3 rounded-lg border border-red-300 bg-red-50 p-5 dark:border-red-900 dark:bg-red-950/30">
          <p className="text-sm">
            <span className="font-medium">Rejected.</span> {draft.rejectionReason}
          </p>
          <form action={returnToDraftAction}>
            <input type="hidden" name="id" value={draft.id} />
            <Button type="submit" variant="secondary">
              Revise
            </Button>
          </form>
        </div>
      )}

      {draft.state === "PUBLISHED" && (
        <p className="rounded-lg border border-green-300 bg-green-50 p-4 text-sm text-green-900 dark:border-green-900 dark:bg-green-950/30 dark:text-green-200">
          Published{" "}
          {draft.publishedAt &&
            new Intl.DateTimeFormat("en-US", { dateStyle: "long", timeStyle: "short" }).format(
              draft.publishedAt,
            )}
          .
        </p>
      )}
    </div>
  );
}
