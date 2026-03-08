import { test, expect } from "@playwright/test";

test("homepage has heading @smoke @e2e", async ({ page }) => {
  await page.goto("https://playwright.dev/");
  await expect(page.getByRole("heading", { level: 1 })).toBeVisible();
});
