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
 * Step 1 keeps the required surface minimal on purpose — no integration
 * credentials are wired up yet.
 */

const serverSchema = z.object({
  NODE_ENV: z.enum(["development", "test", "production"]).default("development"),
  // Optional in Step 1 so `npm run build` works without a database.
  // Becomes required in Phase 1 when persistence lands.
  DATABASE_URL: z
    .string()
    .url()
    .refine((v) => v.startsWith("postgres://") || v.startsWith("postgresql://"), {
      message: "DATABASE_URL must be a PostgreSQL connection string",
    })
    .optional(),
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
