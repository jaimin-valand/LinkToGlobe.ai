import type { Metadata } from "next";
import Link from "next/link";
import { Card, EmptyState } from "@/components/ui/primitives";
import { requireUser } from "@/server/auth";
import { listDrafts } from "@/server/content/service";
import { ApproveButton } from "../drafts/[id]/ApproveButton";

export const metadata: Metadata = { title: "Approvals" };

export default async function ApprovalsPage() {
  const user = await requireUser();
  const queue = await listDrafts(user.id, "USER_APPROVAL");

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Approvals</h1>
        <p className="text-fg-muted mt-1 text-sm">
          Nothing here is published until you approve it. Open one to read it in full and see its
          checks, or send it back with a reason.
        </p>
      </div>

      {queue.length === 0 ? (
        <EmptyState title="Nothing waiting">Drafts that pass their checks show up here.</EmptyState>
      ) : (
        <ul className="flex flex-col gap-3">
          {queue.map((d) => (
            <li key={d.id}>
              <Card className="flex flex-wrap items-center justify-between gap-4">
                <div className="min-w-0">
                  <Link
                    href={`/drafts/${d.id}`}
                    className="font-medium underline-offset-4 hover:underline"
                  >
                    {d.title}
                  </Link>
                  <p className="text-fg-muted mt-0.5 text-xs">
                    Submitted{" "}
                    {d.submittedAt &&
                      new Intl.DateTimeFormat("en-GB", { dateStyle: "medium" }).format(
                        d.submittedAt,
                      )}
                  </p>
                </div>
                <div className="flex shrink-0 gap-2">
                  <Link
                    href={`/drafts/${d.id}`}
                    className="border-border hover:bg-bg inline-flex items-center rounded-md border px-3 py-2 text-sm"
                  >
                    Read it
                  </Link>
                  <ApproveButton id={d.id} title={d.title} />
                </div>
              </Card>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
