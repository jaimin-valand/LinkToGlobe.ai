import { cn } from "@/lib/utils";

interface Check {
  id: string;
  label: string;
  status: "pass" | "warn" | "fail";
  detail: string;
}

const dot = {
  pass: "bg-green-500",
  warn: "bg-amber-500",
  fail: "bg-red-500",
} as const;

export function QualityReportView({
  passed,
  score,
  checks,
  createdAt,
}: {
  passed: boolean;
  score: number;
  checks: Check[];
  createdAt?: Date;
}) {
  return (
    <div className="border-border bg-surface rounded-lg border p-5">
      <div className="flex items-center justify-between gap-4">
        <h3 className="font-medium">Checks</h3>
        <span
          className={cn(
            "rounded px-2 py-0.5 text-xs font-semibold uppercase",
            passed
              ? "bg-green-100 text-green-800 dark:bg-green-950/50 dark:text-green-300"
              : "bg-red-100 text-red-800 dark:bg-red-950/50 dark:text-red-300",
          )}
        >
          {passed ? "Passed" : "Blocked"}, {score} of 100
        </span>
      </div>
      <ul className="mt-3 flex flex-col gap-2">
        {checks.map((c) => (
          <li key={c.id} className="flex gap-2.5 text-sm">
            <span
              className={cn("mt-1.5 h-2 w-2 shrink-0 rounded-full", dot[c.status])}
              aria-hidden
            />
            <span>
              <span className="font-medium">{c.label}.</span>{" "}
              <span className="text-fg-muted">{c.detail}</span>
            </span>
          </li>
        ))}
      </ul>
      {createdAt && (
        <p className="text-fg-muted mt-3 text-xs">
          Run{" "}
          {new Intl.DateTimeFormat("en-GB", { dateStyle: "medium", timeStyle: "short" }).format(
            createdAt,
          )}
        </p>
      )}
    </div>
  );
}
