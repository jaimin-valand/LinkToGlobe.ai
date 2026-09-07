import { test as setup, expect } from "@playwright/test";

const authFile = "e2e/.auth/user.json";

const email = process.env.SEED_USER_EMAIL ?? "dev@linktoglobe.local";
const password = process.env.SEED_USER_PASSWORD ?? "devpassword123";

/**
 * Signs in with the seed account and saves the session cookie for the
 * `authed` project. Requires a database with the seed user
 * (`npm run db:up && npm run db:deploy && npm run db:seed`).
 */
setup("authenticate", async ({ page }) => {
  await page.goto("/login");
  await page.getByLabel("Email").fill(email);
  await page.getByLabel("Password", { exact: true }).fill(password);
  await page.getByRole("button", { name: "Sign in" }).click();
  await expect(page).toHaveURL(/\/drafts/, { timeout: 30_000 });
  await page.context().storageState({ path: authFile });
});
