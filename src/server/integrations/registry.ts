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
    label: "OpenAI (ChatGPT)",
    category: "ai",
    summary: "AI assistance for ideas, hooks, drafting, and review.",
    capabilities: ["Topic ideas", "Hook options", "Draft assistance", "Editorial review"],
    requiredEnv: ["OPENAI_API_KEY"],
    selector: { key: "AI_PROVIDER", equals: "openai" },
    implemented: true,
    notes: ["Advisory only. AI output is never applied to a draft without an explicit action."],
  },
  {
    id: "ai-gemini",
    label: "Google Gemini",
    category: "ai",
    summary: "AI assistance for ideas, hooks, drafting, and review.",
    capabilities: ["Topic ideas", "Hook options", "Draft assistance", "Editorial review"],
    requiredEnv: ["GEMINI_API_KEY"],
    selector: { key: "AI_PROVIDER", equals: "gemini" },
    implemented: true,
    docsUrl: "https://ai.google.dev/",
    notes: ["Advisory only. AI output is never applied to a draft without an explicit action."],
  },
  {
    id: "research",
    label: "Research provider",
    category: "research",
    summary: "Search, source collection, story clustering, and signal extraction.",
    capabilities: [
      "Provider search (Tavily or Google Programmable Search)",
      "Source normalisation and dedupe",
      "Deterministic story clustering",
      "Signal extraction with source traceability",
      "Relevance scoring against your knowledge",
    ],
    requiredEnv: ["RESEARCH_PROVIDER", "RESEARCH_API_KEY"],
    implemented: true,
    docsUrl: "https://developers.google.com/custom-search/v1/overview",
    notes: [
      "Licensed search APIs only. No scraping, no browser automation.",
      "Supported: tavily (RESEARCH_API_KEY), google (RESEARCH_API_KEY + RESEARCH_GOOGLE_CX).",
      "Keys are read on the server only.",
      "The app works without it; the Research page shows a clear not-configured state.",
    ],
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
