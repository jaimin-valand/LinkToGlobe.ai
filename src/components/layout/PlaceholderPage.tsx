import type { ReactNode } from "react";

/** Honest "not built yet" scaffold for navigation targets. No fake data. */
export function PlaceholderPage({
  title,
  phase,
  children,
}: {
  title: string;
  phase: string;
  children: ReactNode;
}) {
  return (
    <div className="flex flex-col gap-3 py-8">
      <p className="border-border bg-surface text-fg-muted inline-flex w-fit rounded-full border px-3 py-1 text-xs font-medium">
        Planned · {phase}
      </p>
      <h1 className="text-3xl font-semibold tracking-tight">{title}</h1>
      <div className="text-fg-muted max-w-2xl">{children}</div>
    </div>
  );
}
