import { test, expect } from "@playwright/test";

let attempt = 0;

test("flaky style retry demo @flaky @e2e", async ({ page }) => {
  attempt += 1;
  await page.goto("https://example.com/");
  if (attempt === 1) {
    expect(false, "Simulated first-attempt flake").toBe(true);
  }
  await expect(page).toHaveTitle(/Example Domain/);
});
