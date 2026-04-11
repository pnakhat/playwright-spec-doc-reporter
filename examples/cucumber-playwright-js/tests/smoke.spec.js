// @ts-check
import { test, expect } from "@playwright/test";

/**
 * Regular Playwright tests that run alongside the Cucumber scenarios.
 * Both sets of results appear in the same glossy report.
 */

test.describe("Playwright Smoke Tests", () => {
  test("Todo app loads @smoke", async ({ page }) => {
    await page.goto("https://demo.playwright.dev/todomvc");
    await expect(page.locator("h1")).toContainText("todos");
    await expect(page.locator(".new-todo")).toBeVisible();
  });

  test("JSONPlaceholder returns posts @api @smoke", async ({ request }) => {
    const response = await request.get("https://jsonplaceholder.typicode.com/posts");
    expect(response.status()).toBe(200);
    const body = await response.json();
    expect(Array.isArray(body)).toBe(true);
    expect(body.length).toBeGreaterThan(0);
  });
});
