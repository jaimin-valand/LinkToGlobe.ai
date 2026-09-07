import { defineConfig, devices } from "@playwright/test";

const PORT = 3000;
const baseURL = `http://localhost:${PORT}`;
const authFile = "e2e/.auth/user.json";

/**
 * E2E config.
 *
 * `npm run test:e2e` starts the dev server (so the deterministic `fixture`
 * research provider is available — it is refused in production) and runs specs
 * from ./e2e. Production build correctness is covered separately by
 * `npm run build`.
 *
 * Authenticated specs (`*.authed.spec.ts`) reuse a signed-in storage state
 * produced by `auth.setup.ts`; they need a database with the seed account.
 */
export default defineConfig({
  testDir: "./e2e",
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 1 : 0,
  reporter: process.env.CI ? "github" : "list",
  use: { baseURL, trace: "on-first-retry" },
  projects: [
    { name: "setup", testMatch: /auth\.setup\.ts/ },
    {
      name: "chromium",
      use: { ...devices["Desktop Chrome"] },
      testIgnore: [/auth\.setup\.ts/, /\.authed\.spec\.ts/],
    },
    {
      name: "authed",
      use: { ...devices["Desktop Chrome"], storageState: authFile },
      dependencies: ["setup"],
      testMatch: /\.authed\.spec\.ts/,
    },
  ],
  webServer: {
    command: "npm run dev",
    url: baseURL,
    reuseExistingServer: !process.env.CI,
    timeout: 120_000,
    env: {
      RESEARCH_PROVIDER: "fixture",
      SEED_USER_EMAIL: process.env.SEED_USER_EMAIL ?? "dev@linktoglobe.local",
      SEED_USER_PASSWORD: process.env.SEED_USER_PASSWORD ?? "devpassword123",
    },
  },
});
