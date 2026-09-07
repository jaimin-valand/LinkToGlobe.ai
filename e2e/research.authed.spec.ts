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
  const ideaUrl = page.url();

  // Hook Lab: with no AI key the manual path is available; a candidate is
  // scored and can be selected for the draft.
  const HOOK = "Why do we still page a human for what a script could catch first?";
  await page.getByRole("link", { name: /Hook Lab/ }).click();
  await expect(page).toHaveURL(/\/hooks\/\w+$/, { timeout: 30_000 });
  await expect(page.getByRole("heading", { name: "Hook Lab" })).toBeVisible();
  await expect(page.getByText("AI generation is off")).toBeVisible();

  await page.getByLabel("Write your own").fill(HOOK);
  await page.getByRole("button", { name: "Add candidate" }).click();

  const card = page.getByRole("listitem").filter({ hasText: HOOK });
  await expect(card).toBeVisible();
  await expect(card.getByText("Question")).toBeVisible(); // classified strategy
  await expect(card.getByText(/Relevance/)).toBeVisible();
  await card.getByRole("button", { name: "Use this hook" }).click();
  await expect(page.getByRole("region", { name: "Selected hook" })).toContainText(HOOK);

  // Back on the idea, the chosen hook shows and carries into the draft.
  await page.goto(ideaUrl);
  await expect(page.locator("p", { hasText: HOOK })).toBeVisible();
  await page.getByRole("button", { name: "Turn into draft" }).click();
  await expect(page).toHaveURL(/\/drafts\/\w+$/, { timeout: 30_000 });
  await expect(page.getByText("Draft", { exact: true })).toBeVisible();
  await expect(page.getByLabel("Hook", { exact: true })).toHaveValue(HOOK);
  const provenance = page.locator("p", { hasText: "From idea" });
  await expect(provenance).toBeVisible();

  // Back on the idea, the button is replaced by a link to the draft.
  await provenance.getByRole("link").click();
  await expect(page).toHaveURL(ideaUrl, { timeout: 30_000 });
  await expect(page.getByRole("link", { name: "Open the draft" })).toBeVisible();
  await expect(page.getByRole("button", { name: "Turn into draft" })).toHaveCount(0);

  // The lab now appears on the Hooks index with its chosen hook.
  const ideaId = ideaUrl.split("/").pop();
  await page.goto("/hooks");
  await expect(page.getByRole("heading", { name: "Hooks", exact: true })).toBeVisible();
  const labRow = page
    .getByRole("listitem")
    .filter({ has: page.locator(`a[href="/hooks/${ideaId}"]`) });
  await expect(labRow).toContainText("Hook chosen");
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
