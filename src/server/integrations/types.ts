/**
 * Integration boundary.
 *
 * This module is a *declaration* of the external services LinkToGlobe.ai will
 * connect to, plus a check of whether each one is configured. It performs no
 * network calls and imports no provider SDKs. Actual client code lands per
 * integration in later work (see `implemented`).
 */

export type IntegrationStatus = "connected" | "not_configured" | "error";

export type IntegrationCategory = "ai" | "research" | "publishing" | "email" | "data" | "calendar";

export interface IntegrationDescriptor {
  id: string;
  label: string;
  category: IntegrationCategory;
  /** One line: what this connection is for. */
  summary: string;
  /** What it will do once connected. */
  capabilities: string[];
  /**
   * Env vars that must all be present for the integration to be considered
   * configured. An empty list means "always configured" (e.g. the built-in
   * manual AI mode).
   */
  requiredEnv: string[];
  /** Extra env var that, when set to this value, selects the integration. */
  selector?: { key: string; equals: string };
  /** True once real client code exists, not just this boundary. */
  implemented: boolean;
  docsUrl?: string;
  /** Notes shown to the user (safety, permissions, limitations). */
  notes?: string[];
}

export interface IntegrationState extends IntegrationDescriptor {
  status: IntegrationStatus;
  /** Required env vars that are currently missing. */
  missingEnv: string[];
}
