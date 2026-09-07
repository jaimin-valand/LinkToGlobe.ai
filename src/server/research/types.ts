/**
 * Research provider boundary.
 *
 * The domain layer talks to `ResearchProvider`, never to a vendor SDK. A
 * provider is configured through the integration env vars (RESEARCH_PROVIDER,
 * RESEARCH_API_KEY) and returns normalised sources. It performs no scraping and
 * fetches only its own official API.
 */

export interface ResearchSearchOptions {
  /** Upper bound on results to request. */
  limit?: number;
  /** Optional recency hint in days (provider may ignore). */
  sinceDays?: number;
  /** Abort the request after this many ms. */
  timeoutMs?: number;
}

/** A single source as returned by a provider, before persistence. */
export interface NormalizedSource {
  title: string;
  url: string;
  publisher?: string;
  author?: string;
  publishedAt?: Date;
  excerpt: string;
  providerSourceId?: string;
  /** Provider's own relevance/score for the query, if it supplies one (0..1). */
  providerRelevance?: number;
  /** Anything else worth keeping, provider-specific. */
  metadata?: Record<string, unknown>;
}

export interface ProviderSearchResult {
  provider: string;
  query: string;
  sources: NormalizedSource[];
  /** Raw provider answer/summary if it offers one. Advisory only. */
  providerSummary?: string;
}

export interface ResearchProvider {
  readonly id: string;
  search(query: string, options?: ResearchSearchOptions): Promise<ProviderSearchResult>;
}

// ── Error taxonomy ──────────────────────────────────────────────────────────
// The service maps these to safe, user-facing messages. Provider detail is
// logged server-side only, never sent to the client.

export class ResearchError extends Error {
  /** Stable code the UI can branch on. */
  readonly code: string;
  constructor(code: string, message: string) {
    super(message);
    this.name = "ResearchError";
    this.code = code;
  }
}

export class NotConfiguredError extends ResearchError {
  constructor(msg = "No research provider is configured.") {
    super("not_configured", msg);
    this.name = "NotConfiguredError";
  }
}
export class ProviderAuthError extends ResearchError {
  constructor(msg = "The research provider rejected the API key.") {
    super("auth", msg);
    this.name = "ProviderAuthError";
  }
}
export class ProviderRateLimitError extends ResearchError {
  constructor(msg = "The research provider is rate limiting requests.") {
    super("rate_limit", msg);
    this.name = "ProviderRateLimitError";
  }
}
export class ProviderTimeoutError extends ResearchError {
  constructor(msg = "The research provider did not respond in time.") {
    super("timeout", msg);
    this.name = "ProviderTimeoutError";
  }
}
export class ProviderResponseError extends ResearchError {
  constructor(msg = "The research provider returned an unexpected response.") {
    super("provider_error", msg);
    this.name = "ProviderResponseError";
  }
}
export class MalformedResponseError extends ResearchError {
  constructor(msg = "The research provider response could not be read.") {
    super("malformed", msg);
    this.name = "MalformedResponseError";
  }
}

/** One user-safe message per error code. Never leak provider internals. */
export function safeMessageFor(err: unknown): string {
  if (err instanceof ResearchError) {
    switch (err.code) {
      case "not_configured":
        return "Research provider not configured.";
      case "auth":
        return "The research provider rejected the configured API key.";
      case "rate_limit":
        return "The research provider is rate limiting. Try again shortly.";
      case "timeout":
        return "The research provider timed out. Try again.";
      case "malformed":
        return "The research provider returned a response we could not read.";
      default:
        return "The research provider had a problem. Try again.";
    }
  }
  return "Something went wrong running the research.";
}
