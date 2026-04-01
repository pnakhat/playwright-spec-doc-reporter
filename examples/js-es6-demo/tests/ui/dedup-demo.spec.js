// @ts-check
/**
 * Deduplication demo spec — always fails so we can test that running it twice
 * creates exactly ONE Jira bug (the second run is blocked by glossy-bugs.json).
 *
 * Run with:
 *   npx playwright test dedup-demo --project chromium
 */
import { test, expect } from "@playwright/test";
import { addFeature, addScenario, addBehaviour } from "../../annotations.mjs";

test.describe("Dedup Demo", () => {
  test.beforeEach(() => {
    addFeature("Dedup Demo", "Verifies cross-run Jira deduplication via local state file");
  });

  test("broken selector always fails — dedup demo @regression", async ({ page }) => {
    test.fail(); // intentionally failing — demonstrates Jira dedup across runs
    addScenario("This test is intentionally broken to trigger Jira bug creation");
    addBehaviour("Navigate to saucedemo login page");
    await page.goto("https://www.saucedemo.com/");

    addBehaviour("Assert against a selector that does not exist — this will always fail");
    // This locator does not exist — will throw a TimeoutError
    await expect(page.locator("#this-element-does-not-exist")).toBeVisible({ timeout: 3000 });
  });
});
