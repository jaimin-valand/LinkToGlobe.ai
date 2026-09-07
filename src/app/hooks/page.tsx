import type { Metadata } from "next";
import Link from "next/link";
import { Badge, Card, EmptyState } from "@/components/ui/primitives";
import { requireUser } from "@/server/auth";
import { listLabs } from "@/server/hooks";

export const metadata: Metadata = { title: "Hooks" };

export default async function HooksPage() {
  const user = await requireUser();
  const labs = await listLabs(user.id);

  return (
    <div className="flex max-w-3xl flex-col gap-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Hooks</h1>
        <p className="text-fg-muted mt-1 text-sm">
          The opening line is the part most people judge. Hook Lab drafts options for an idea,
          scores each one, and hands the one you pick to the draft.
        </p>
      </div>

      {labs.length === 0 ? (
        <EmptyState title="No hook work yet">
          Open an idea from the{" "}
          <Link href="/ideas" className="text-signal underline underline-offset-2">
            Ideas
          </Link>{" "}
          page and start its Hook Lab.
        </EmptyState>
      ) : (
        <ul className="flex flex-col gap-3">
          {labs.map((lab) => (
            <li key={lab.ideaId}>
              <Card className="flex flex-wrap items-center justify-between gap-3">
                <div className="min-w-0">
                  <Link
                    href={`/hooks/${lab.ideaId}`}
                    className="font-medium underline-offset-4 hover:underline"
                  >
                    {lab.ideaTitle}
                  </Link>
                  <p className="text-fg-muted mt-0.5 text-xs">
                    {lab.candidateCount} {lab.candidateCount === 1 ? "candidate" : "candidates"} ·
                    updated{" "}
                    {new Intl.DateTimeFormat("en-GB", { dateStyle: "medium" }).format(
                      lab.updatedAt,
                    )}
                  </p>
                </div>
                {lab.selectedStrategyLabel ? (
                  <Badge tone="green">Hook chosen · {lab.selectedStrategyLabel}</Badge>
                ) : (
                  <Badge tone="neutral">No hook chosen</Badge>
                )}
              </Card>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
