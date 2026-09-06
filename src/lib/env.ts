import { z } from "zod";

/**
 * Environment configuration.
 *
 * Rules (see SECURITY.md):
 *  - Server-only secrets live in `serverSchema` and are read via `getServerEnv()`.
 *    They must never be imported into a Client Component.
 *  - Anything the browser may see MUST be prefixed `NEXT_PUBLIC_` and declared
 *    in `clientSchema`. `isPublicEnvKey()` enforces that boundary in tests.
 *
 * Integration credentials (AI, research, LinkedIn, email, company data,
 * calendar) are all OPTIONAL. The app runs fully with none of them set; each
 * integration reports "Not configured" until its variables are provided.
 * See src/server/integrations/registry.ts.
 */

const serverSchema = z.object({
  NODE_ENV: z.enum(["development", "test", "production"]).default("development"),

  DATABASE_URL: z
    .string()
    .min(1, "DATABASE_URL is required")
    .refine((v) => v.startsWith("postgres://") || v.startsWith("postgresql://"), {
      message: "DATABASE_URL must be a PostgreSQL connection string",
    }),

  AUTH_SECRET: z.string().min(16, "AUTH_SECRET must be at least 16 characters"),

  // ── AI provider (optional; defaults to the no-op "manual" provider) ─────────
  AI_PROVIDER: z.enum(["manual", "anthropic", "openai"]).default("manual"),
  AI_MODEL: z.string().default("claude-sonnet-5"),
  AI_API_KEY: z.string().optional(), // Anthropic
  OPENAI_API_KEY: z.string().optional(),

  // ── Research / search provider (optional; boundary only, not implemented) ───
  RESEARCH_PROVIDER: z.string().optional(),
  RESEARCH_API_KEY: z.string().optional(),

  // ── LinkedIn official OAuth app (optional; boundary only) ───────────────────
  LINKEDIN_CLIENT_ID: z.string().optional(),
  LINKEDIN_CLIENT_SECRET: z.string().optional(),
  LINKEDIN_REDIRECT_URI: z.string().url().optional(),

  // ── Email provider OAuth app (optional; boundary only) ─────────────────────
  EMAIL_PROVIDER: z.enum(["gmail", "microsoft"]).optional(),
  EMAIL_OAUTH_CLIENT_ID: z.string().optional(),
  EMAIL_OAUTH_CLIENT_SECRET: z.string().optional(),
  EMAIL_OAUTH_REDIRECT_URI: z.string().url().optional(),

  // ── Company / people data provider (optional; boundary only) ───────────────
  COMPANY_DATA_PROVIDER: z.string().optional(),
  COMPANY_DATA_API_KEY: z.string().optional(),

  // ── Calendar provider OAuth app (optional; boundary only) ──────────────────
  CALENDAR_PROVIDER: z.enum(["google", "microsoft"]).optional(),
  CALENDAR_OAUTH_CLIENT_ID: z.string().optional(),
  CALENDAR_OAUTH_CLIENT_SECRET: z.string().optional(),
  CALENDAR_OAUTH_REDIRECT_URI: z.string().url().optional(),

  // ── Dev seed convenience ──────────────────────────────────────────────────
  SEED_USER_EMAIL: z.string().email().optional(),
  SEED_USER_PASSWORD: z.string().min(8).optional(),
});

const clientSchema = z.object({
  NEXT_PUBLIC_APP_URL: z.string().url().default("http://localhost:3000"),
});

export type ServerEnv = z.infer<typeof serverSchema>;
export type ClientEnv = z.infer<typeof clientSchema>;

function format(error: z.ZodError): string {
  return error.issues.map((i) => `  - ${i.path.join(".") || "(root)"}: ${i.message}`).join("\n");
}

let cachedServer: ServerEnv | null = null;
let cachedClient: ClientEnv | null = null;

/** Parse and cache server-side environment. Throws on invalid config. */
export function getServerEnv(): ServerEnv {
  if (cachedServer) return cachedServer;
  const parsed = serverSchema.safeParse(process.env);
  if (!parsed.success) {
    throw new Error(`Invalid server environment configuration:\n${format(parsed.error)}`);
  }
  if (parsed.data.AI_PROVIDER === "anthropic" && !parsed.data.AI_API_KEY) {
    throw new Error(
      "Invalid server environment configuration:\n  - AI_API_KEY: required when AI_PROVIDER=anthropic",
    );
  }
  if (parsed.data.AI_PROVIDER === "openai" && !parsed.data.OPENAI_API_KEY) {
    throw new Error(
      "Invalid server environment configuration:\n  - OPENAI_API_KEY: required when AI_PROVIDER=openai",
    );
  }
  cachedServer = parsed.data;
  return cachedServer;
}

/** Parse and cache the browser-safe environment. Throws on invalid config. */
export function getClientEnv(): ClientEnv {
  if (cachedClient) return cachedClient;
  const parsed = clientSchema.safeParse({
    NEXT_PUBLIC_APP_URL: process.env.NEXT_PUBLIC_APP_URL,
  });
  if (!parsed.success) {
    throw new Error(`Invalid client environment configuration:\n${format(parsed.error)}`);
  }
  cachedClient = parsed.data;
  return cachedClient;
}

/** True only for keys that are safe to expose to the browser. */
export function isPublicEnvKey(key: string): boolean {
  return key.startsWith("NEXT_PUBLIC_");
}

/** Test/utility seam so callers can reset the memoized parse. */
export function __resetEnvCache(): void {
  cachedServer = null;
  cachedClient = null;
}

export const clientEnvSchema = clientSchema;
export const serverEnvSchema = serverSchema;
