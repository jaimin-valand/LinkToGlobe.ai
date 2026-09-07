import { test, expect } from "@playwright/test";

/**
 * Full research flow against the deterministic `fixture` provider (set by the
 * webServer env in playwright.config.ts). Needs the seed account in the DB.
 */

test("fixture provider results can be produced, explained, and saved as an idea", async ({
  page,
}) => {
  await page.goto("/research");

  await expect(page.getByRole("heading", { name: "Research", exact: true })).toBeVisible();
  await expect(page.getByText("Fixture provider active")).toBeVisible();

  await page.getByLabel("Research query").fill("on-call reliability");
  await page.getByRole("button", { name: "Research" }).click();

  await expect(page).toHaveURL(/\/research\/[a-z0-9]+$/, { timeout: 30_000 });
  await expect(page.getByRole("heading", { name: "on-call reliability" })).toBeVisible();

  await expect(page.getByRole("heading", { name: /Signals \(/ })).toBeVisible();
  await expect(page.getByRole("heading", { name: /Sources \(/ })).toBeVisible();
  await expect(page.getByText("[fixture]").first()).toBeVisible();
  await expect(page.getByText("Why this matters to you:").first()).toBeVisible();
  await expect(page.getByText("Possible angle:").first()).toBeVisible();

  await page.getByRole("button", { name: "Save as idea" }).first().click();
  await expect(page.getByText("Saved as an idea").first()).toBeVisible();

  // The saved idea is persisted and listed on the Ideas page.
  await page.goto("/ideas");
  await expect(page.getByRole("heading", { name: "Ideas", exact: true })).toBeVisible();
  const firstIdea = page.getByRole("main").locator("ul li a").first();
  await expect(firstIdea).toBeVisible();

  // Opening it shows the angle.
  await firstIdea.click();
  await expect(page).toHaveURL(/\/ideas\/\w+$/, { timeout: 30_000 });
  await expect(page.getByRole("heading", { level: 1 })).toBeVisible();
  await expect(page.getByText("Suggested angle")).toBeVisible();
});

test("an over-short query does not start a run", async ({ page }) => {
  await page.goto("/research");
  await page.getByLabel("Research query").fill("ab");
  await page.getByRole("button", { name: "Research" }).click();
  await expect(page).toHaveURL(/\/research$/);
});

test("an unknown run id shows the not-found page", async ({ page }) => {
  // In dev the initial response streams the loading shell (200); assert on the
  // rendered outcome, which is what the requirement is about.
  await page.goto("/research/does-not-exist");
  await expect(page.getByText("Page not found")).toBeVisible({ timeout: 30_000 });
});
