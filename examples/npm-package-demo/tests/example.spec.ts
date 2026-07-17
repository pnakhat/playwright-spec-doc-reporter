import { test, expect } from "@playwright/test";
import { addFeature, addScenario } from "playwright-spec-doc-reporter/annotations";

test("homepage has heading @smoke @e2e", async ({ page }) => {
  addFeature("Playwright homepage", "As a visitor I want the landing page to load");
  addScenario("The landing page shows a top-level heading");

  await page.goto("https://playwright.dev/");
  await expect(page.getByRole("heading", { level: 1 })).toBeVisible();
});

test("docs link is reachable @smoke", async ({ page }) => {
  addFeature("Playwright homepage", "As a visitor I want the landing page to load");
  addScenario("The Docs navigation link is visible on the landing page");

  await page.goto("https://playwright.dev/");
  const docs = page.getByRole("link", { name: "Docs" }).first();
  await expect(docs).toBeVisible();
});
