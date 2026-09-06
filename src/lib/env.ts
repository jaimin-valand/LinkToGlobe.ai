import { z } from "zod";

/**
 * Environment configuration.
 *
 * Rules (see SECURITY.md):
 *  - Server-only secrets live in `serverSchema` and are read via `getServerEnv()`.
 *    They must never be imported into a Client Component.
 *  - Anything the browser may see MUST be prefixed `NEXT_PUBLIC_` and declared
 *    in `clientSchema`. `isPublicEnvKey()` enforces that boundary in tests.
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

  AI_PROVIDER: z.enum(["manual", "anthropic"]).default("manual"),
  AI_API_KEY: z.string().optional(),
  AI_MODEL: z.string().default("claude-sonnet-5"),

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
