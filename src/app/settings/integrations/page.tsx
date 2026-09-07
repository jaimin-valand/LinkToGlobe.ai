import type { Metadata } from "next";
import { Badge, Card } from "@/components/ui/primitives";
import { requireUser } from "@/server/auth";
import { getAi } from "@/server/ai";
import { listIntegrations } from "@/server/integrations";
import type { IntegrationCategory, IntegrationState } from "@/server/integrations";

export const metadata: Metadata = { title: "Integrations" };

const CATEGORY_LABELS: Record<IntegrationCategory, string> = {
  ai: "AI",
  research: "Research",
  publishing: "Publishing",
  email: "Email",
  data: "Company & people data",
  calendar: "Calendar",
};

function StatusBadge({ status }: { status: IntegrationState["status"] }) {
  if (status === "connected") return <Badge tone="green">Connected</Badge>;
  if (status === "error") return <Badge tone="red">Error</Badge>;
  return <Badge tone="neutral">Not configured</Badge>;
}

export default async function IntegrationsPage() {
  await requireUser();
  const integrations = listIntegrations();
  const aiMode = getAi().id;

  const byCategory = integrations.reduce<Record<string, IntegrationState[]>>((acc, i) => {
    (acc[i.category] ??= []).push(i);
    return acc;
  }, {});

  return (
    <div className="flex max-w-3xl flex-col gap-8">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Integrations</h1>
        <p className="text-fg-muted mt-1 text-sm">
          External services the product connects to. Each one is optional and set through
          environment variables. The app runs without any of them. Nothing here connects on its own.
        </p>
      </div>

      {aiMode === "manual" && (
        <Card>
          <p className="text-sm">
            <span className="font-medium">AI: manual mode.</span>{" "}
            <span className="text-fg-muted">
              No AI service is connected, so you write drafts yourself. Set{" "}
              <code className="font-mono">AI_PROVIDER</code> and the matching key to enable
              assistance.
            </span>
          </p>
        </Card>
      )}

      {(Object.keys(byCategory) as IntegrationCategory[]).map((category) => (
        <section key={category} className="flex flex-col gap-3">
          <h2 className="text-fg-muted text-sm font-semibold tracking-wide uppercase">
            {CATEGORY_LABELS[category]}
          </h2>
          <div className="flex flex-col gap-3">
            {byCategory[category].map((i) => (
              <Card key={i.id} className="flex flex-col gap-3">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="font-medium">{i.label}</span>
                      {!i.implemented && <Badge tone="neutral">Boundary only</Badge>}
                    </div>
                    <p className="text-fg-muted mt-0.5 text-sm">{i.summary}</p>
                  </div>
                  <StatusBadge status={i.status} />
                </div>

                {i.capabilities.length > 0 && (
                  <p className="text-fg-muted text-xs">
                    Once connected: {i.capabilities.join(", ")}.
                  </p>
                )}

                {i.status !== "connected" && i.requiredEnv.length > 0 && (
                  <p className="text-fg-muted text-xs">
                    Configuration required. Set{" "}
                    {i.requiredEnv.map((k, idx) => (
                      <span key={k}>
                        {idx > 0 && ", "}
                        <code className="font-mono">{k}</code>
                      </span>
                    ))}
                    {i.selector && (
                      <>
                        {" "}
                        and <code className="font-mono">{i.selector.key}</code>=
                        <code className="font-mono">{i.selector.equals}</code>
                      </>
                    )}
                    .
                  </p>
                )}

                {i.notes?.map((note) => (
                  <p key={note} className="text-fg-muted text-xs">
                    {note}
                  </p>
                ))}

                {i.docsUrl && (
                  <a
                    href={i.docsUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-signal text-xs underline underline-offset-2"
                  >
                    Provider docs
                  </a>
                )}
              </Card>
            ))}
          </div>
        </section>
      ))}
    </div>
  );
}
