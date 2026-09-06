import type { IntegrationDescriptor, IntegrationState } from "./types";

/**
 * Every external connection the product is being built toward. Ordered roughly
 * by the roadmap. `implemented: false` means the boundary is declared but the
 * client code is future work.
 */
export const INTEGRATIONS: IntegrationDescriptor[] = [
  {
    id: "ai-anthropic",
    label: "Anthropic",
    category: "ai",
    summary: "AI assistance for ideas, hooks, drafting, and review.",
    capabilities: ["Topic ideas", "Hook options", "Draft assistance", "Editorial review"],
    requiredEnv: ["AI_API_KEY"],
    selector: { key: "AI_PROVIDER", equals: "anthropic" },
    implemented: true,
    notes: ["Advisory only. AI output is never applied to a draft without an explicit action."],
  },
  {
    id: "ai-openai",
    label: "OpenAI",
    category: "ai",
    summary: "AI assistance for ideas, hooks, drafting, and review.",
    capabilities: ["Topic ideas", "Hook options", "Draft assistance", "Editorial review"],
    requiredEnv: ["OPENAI_API_KEY"],
    selector: { key: "AI_PROVIDER", equals: "openai" },
    implemented: true,
    notes: ["Advisory only. AI output is never applied to a draft without an explicit action."],
  },
  {
    id: "research",
    label: "Research provider",
    category: "research",
    summary: "Current news and topic discovery, source collection and comparison.",
    capabilities: [
      "Topic discovery",
      "Source collection",
      "Signal clustering",
      "Relevance scoring",
    ],
    requiredEnv: ["RESEARCH_PROVIDER", "RESEARCH_API_KEY"],
    implemented: false,
    notes: ["Uses a licensed search/news API. No scraping."],
  },
  {
    id: "linkedin",
    label: "LinkedIn",
    category: "publishing",
    summary: "Official OAuth connection for publishing approved posts.",
    capabilities: ["Post creation via the official API", "Publish confirmation"],
    requiredEnv: ["LINKEDIN_CLIENT_ID", "LINKEDIN_CLIENT_SECRET"],
    implemented: false,
    docsUrl: "https://learn.microsoft.com/linkedin/",
    notes: [
      "Official OAuth and API only.",
      "No password collection, no cookie or session-token storage, no automation that evades platform rules.",
      "A post is reported as published only when the API confirms it.",
    ],
  },
  {
    id: "email",
    label: "Email (Gmail / Outlook)",
    category: "email",
    summary: "OAuth connection for drafting and, with approval, sending follow-ups.",
    capabilities: ["Draft outreach and follow-ups", "Send with explicit user approval"],
    requiredEnv: ["EMAIL_PROVIDER", "EMAIL_OAUTH_CLIENT_ID", "EMAIL_OAUTH_CLIENT_SECRET"],
    implemented: false,
    notes: ["Official OAuth only. Nothing is sent without explicit user approval."],
  },
  {
    id: "company-data",
    label: "Company & people data",
    category: "data",
    summary: "Licensed company and professional-contact information.",
    capabilities: ["Company profiles", "Role and contact lookup from a licensed source"],
    requiredEnv: ["COMPANY_DATA_PROVIDER", "COMPANY_DATA_API_KEY"],
    implemented: false,
    notes: ["Licensed data source only. No scraping. Contact details are never fabricated."],
  },
  {
    id: "calendar",
    label: "Calendar (Google / Outlook)",
    category: "calendar",
    summary: "Optional calendar connection for scheduling context.",
    capabilities: ["Read availability", "Create events with approval"],
    requiredEnv: ["CALENDAR_PROVIDER", "CALENDAR_OAUTH_CLIENT_ID", "CALENDAR_OAUTH_CLIENT_SECRET"],
    implemented: false,
    notes: ["Optional. Official OAuth only."],
  },
];

function evaluate(descriptor: IntegrationDescriptor): IntegrationState {
  const missingEnv = descriptor.requiredEnv.filter((key) => {
    const v = process.env[key];
    return !v || v.trim() === "";
  });

  const selectorActive =
    !descriptor.selector || process.env[descriptor.selector.key] === descriptor.selector.equals;

  const status: IntegrationState["status"] =
    missingEnv.length === 0 && selectorActive ? "connected" : "not_configured";

  return { ...descriptor, status, missingEnv };
}

/** Current state of every integration. Reads env only — no network calls. */
export function listIntegrations(): IntegrationState[] {
  return INTEGRATIONS.map(evaluate);
}

export function getIntegration(id: string): IntegrationState | undefined {
  const found = INTEGRATIONS.find((i) => i.id === id);
  return found ? evaluate(found) : undefined;
}
