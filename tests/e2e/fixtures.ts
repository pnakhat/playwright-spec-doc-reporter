/**
 * Shared Playwright fixtures for the report E2E test suite.
 *
 * Use `test` from this file instead of `@playwright/test` directly so that
 * every test gets the typed fixture helpers and the repeated navigation
 * boilerplate is centralised here.
 */
import { test as base, expect, type Page } from "@playwright/test";

// ─── TestsPage fixture ────────────────────────────────────────────────────────

export interface TestsPageFixture {
  /** Navigates to the Tests tab and waits for the panel to become active. */
  navigateToTests(page: Page): Promise<void>;
  /** Clicks Expand All and waits for the first test-detail-block to appear. */
  expandAll(page: Page): Promise<void>;
}

// ─── DocsPage fixture ─────────────────────────────────────────────────────────

export interface DocsPageFixture {
  /** Navigates to the Docs tab and waits for the panel to become active. */
  navigateToDocs(page: Page): Promise<void>;
}

// ─── Extended test object ─────────────────────────────────────────────────────

type ReportFixtures = {
  testsPage: TestsPageFixture;
  docsPage: DocsPageFixture;
};

export const test = base.extend<ReportFixtures>({
  testsPage: async ({}, use) => {
    const fixture: TestsPageFixture = {
      async navigateToTests(page) {
        await page.locator('[data-page="tests"]').click();
        await expect(page.locator("#page-tests")).toHaveClass(/active/);
      },
      async expandAll(page) {
        await page.getByRole("button", { name: "Expand All" }).click();
        await expect(
          page.locator("#suitesContainer .test-detail-block").first(),
        ).toBeVisible();
      },
    };
    await use(fixture);
  },

  docsPage: async ({}, use) => {
    const fixture: DocsPageFixture = {
      async navigateToDocs(page) {
        await page.locator('[data-page="docs"]').click();
        await expect(page.locator("#page-docs")).toHaveClass(/active/);
      },
    };
    await use(fixture);
  },
});

export { expect };
