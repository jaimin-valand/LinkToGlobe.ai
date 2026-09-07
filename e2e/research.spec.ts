import { test, expect } from "@playwright/test";

test("research and ideas require sign in", async ({ page }) => {
  await page.goto("/research");
  await expect(page).toHaveURL(/\/login\?next=%2Fresearch/);

  await page.goto("/ideas");
  await expect(page).toHaveURL(/\/login\?next=%2Fideas/);

  await page.goto("/hooks");
  await expect(page).toHaveURL(/\/login\?next=%2Fhooks/);
});
