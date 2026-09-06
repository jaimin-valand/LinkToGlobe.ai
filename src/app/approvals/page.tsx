import type { Metadata } from "next";
import Link from "next/link";
import { Button, Card, EmptyState } from "@/components/ui/primitives";
import { requireUser } from "@/server/auth";
import { listDrafts } from "@/server/content/service";
import { approveAction } from "../drafts/actions";

export const metadata: Metadata = { title: "Approvals" };

export default async function ApprovalsPage() {
  const user = await requireUser();
  const queue = await listDrafts(user.id, "USER_APPROVAL");

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Approvals</h1>
        <p className="text-fg-muted mt-1 text-sm">
          The mandatory human gate. Nothing here is published until you approve it. Open a draft to
          review its full text and quality report, or reject with a reason.
        </p>
      </div>

      {queue.length === 0 ? (
        <EmptyState title="Nothing waiting for approval">
          Drafts that pass quality checks land here.
        </EmptyState>
      ) : (
        <ul className="flex flex-col gap-3">
          {queue.map((d) => (
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
                    Submitted{" "}
                    {d.submittedAt &&
                      new Intl.DateTimeFormat("en-US", { dateStyle: "medium" }).format(
                        d.submittedAt,
                      )}
                  </p>
                </div>
                <div className="flex shrink-0 gap-2">
                  <Link
                    href={`/drafts/${d.id}`}
                    className="border-border hover:bg-bg inline-flex items-center rounded-md border px-3 py-2 text-sm"
                  >
                    Review
                  </Link>
                  <form action={approveAction}>
                    <input type="hidden" name="id" value={d.id} />
                    <Button type="submit">Approve</Button>
                  </form>
                </div>
              </Card>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
