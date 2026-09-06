import { Badge } from "@/components/ui/primitives";

const MAP: Record<
  string,
  { tone: "neutral" | "signal" | "reach" | "green" | "red"; label: string }
> = {
  DRAFT: { tone: "neutral", label: "Draft" },
  QUALITY_CHECK: { tone: "signal", label: "Quality check" },
  USER_APPROVAL: { tone: "reach", label: "Awaiting approval" },
  PUBLISHED: { tone: "green", label: "Published" },
  REJECTED: { tone: "red", label: "Rejected" },
};

export function StateBadge({ state }: { state: string }) {
  const entry = MAP[state] ?? { tone: "neutral" as const, label: state };
  return <Badge tone={entry.tone}>{entry.label}</Badge>;
}
