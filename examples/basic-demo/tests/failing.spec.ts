import { test, expect } from "@playwright/test";

test("intentional failing locator @regression", async ({ page }) => {
  await page.goto("https://playwright.dev/");
  await expect(page.getByTestId("this-does-not-exist")).toBeVisible();
});
