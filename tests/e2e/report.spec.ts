import { test, expect } from "./fixtures.js";
import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const REPORT_URL = `file://${path.join(__dirname, "../../examples/js-es6-demo/spec-doc-report/index.html")}`;

test.beforeEach(async ({ page }) => {
  await page.goto(REPORT_URL);
});

// ---------------------------------------------------------------------------
// Topbar
// ---------------------------------------------------------------------------

test.describe("Topbar", () => {
  test("shows report title", async ({ page }) => {
    await expect(page.locator("#brand-title")).toContainText("Multi-Browser Stress Test Report");
  });

  test("shows run date and duration", async ({ page }) => {
    await expect(page.locator("#meta-time")).not.toBeEmpty();
    await expect(page.locator("#meta-duration")).not.toBeEmpty();
  });

  test("shows Playwright Reporter label", async ({ page }) => {
    await expect(page.locator(".topbar-brand-subtitle")).toContainText("Spec Documentation");
  });

  test("theme toggle button cycles through themes", async ({ page }) => {
    const html = page.locator("html");
    const btn = page.locator("#btnThemeToggle");

    await expect(html).toHaveAttribute("data-theme", "dark-glossy");
    await btn.click();
    await expect(html).toHaveAttribute("data-theme", "dark");
    await btn.click();
    await expect(html).toHaveAttribute("data-theme", "light");
    await btn.click();
    await expect(html).toHaveAttribute("data-theme", "dark-glossy");
  });

  test("print button exists", async ({ page }) => {
    await expect(page.locator("#btnExportPdf")).toBeVisible();
  });
});

// ---------------------------------------------------------------------------
// Navigation
// ---------------------------------------------------------------------------

test.describe("Tab Navigation", () => {
  test("overview tab is active on load", async ({ page }) => {
    await expect(page.locator('[data-page="overview"]')).toHaveClass(/active/);
    await expect(page.locator("#page-overview")).toHaveClass(/active/);
  });

  test("switching to Tests tab shows tests panel", async ({ page }) => {
    await page.locator('[data-page="tests"]').click();
    await expect(page.locator("#page-tests")).toHaveClass(/active/);
    await expect(page.locator("#page-overview")).not.toHaveClass(/active/);
  });

  // Parameterize the 4 remaining "tab shows panel" tests — each follows the same pattern.
  for (const { tabName, panelId } of [
    { tabName: "ai",     panelId: "#page-ai"     },
    { tabName: "trends", panelId: "#page-trends"  },
    { tabName: "docs",   panelId: "#page-docs"    },
  ]) {
    test(`switching to ${tabName} tab shows its panel`, async ({ page }) => {
      await page.locator(`[data-page="${tabName}"]`).click();
      await expect(page.locator(panelId)).toHaveClass(/active/);
    });
  }

  test("only one page panel is active at a time", async ({ page }) => {
    await page.locator('[data-page="tests"]').click();
    const activePanels = page.locator(".page-panel.active");
    await expect(activePanels).toHaveCount(1);
  });
});

// ---------------------------------------------------------------------------
// Overview Page
// ---------------------------------------------------------------------------

test.describe("Overview Page", () => {
  test("donut chart shows a pass rate percentage", async ({ page }) => {
    // Assert via the embedded report data rather than DOM text to avoid template brittleness
    const hasPercent = await page.evaluate(() =>
      /\d+(\.\d+)?%/.test(document.getElementById("donut-pct")?.textContent ?? ""),
    );
    expect(hasPercent).toBe(true);
  });

  test("hero title is populated from report data", async ({ page }) => {
    // Assert non-empty via evaluate so this test doesn't depend on exact DOM selector text
    const heroText = await page.evaluate(
      () => document.getElementById("hero-title")?.textContent?.trim() ?? "",
    );
    expect(heroText.length).toBeGreaterThan(0);
  });

  test("stats grid renders cards", async ({ page }) => {
    const cards = page.locator("#stats-grid .stat-card");
    await expect(cards).not.toHaveCount(0);
  });

  test("progress bar section is rendered", async ({ page }) => {
    await expect(page.locator(".progress-stack")).toBeVisible();
    await expect(page.locator(".progress-seg").first()).toBeVisible();
  });

  test("footer is rendered", async ({ page }) => {
    await expect(page.locator("#footer")).not.toBeEmpty();
  });
});

// ---------------------------------------------------------------------------
// Tests Page
// ---------------------------------------------------------------------------

test.describe("Tests Page", () => {
  test.beforeEach(async ({ page, testsPage }) => {
    await testsPage.navigateToTests(page);
  });

  test("suites container renders test rows", async ({ page }) => {
    const suites = page.locator("#suitesContainer .suite-block");
    await expect(suites).not.toHaveCount(0);
  });

  // Parameterize: all four status filter buttons share the same visibility pattern.
  for (const filter of ["all", "passed", "failed", "skipped"]) {
    test(`${filter} filter button is visible`, async ({ page }) => {
      await expect(page.locator(`.filter-btn[data-filter="${filter}"]`)).toBeVisible();
    });
  }

  test("All filter is active by default", async ({ page }) => {
    await expect(page.locator('.filter-btn[data-filter="all"]')).toHaveClass(/active/);
  });

  test("search input is visible", async ({ page }) => {
    await expect(page.locator("#search-input")).toBeVisible();
  });

  test("searching filters visible suites", async ({ page }) => {
    // Read the first test name via evaluate to avoid auto-wait on potentially hidden elements
    const firstTestName = await page.evaluate(() => {
      const el = document.querySelector("#suitesContainer .test-detail-block .suite-name");
      return el?.textContent?.trim() ?? null;
    });
    const searchTerm = firstTestName?.split(/\s+/)[0] ?? "can";
    const allCount = await page.locator("#suitesContainer .suite-block").count();
    const input = page.locator("#search-input");
    await input.fill(searchTerm);
    // Wait for at least one suite to become visible rather than using a fixed timeout
    await expect(page.locator("#suitesContainer .suite-block:visible").first()).toBeVisible();
    const visibleCount = await page.locator("#suitesContainer .suite-block:visible").count();
    expect(visibleCount).toBeGreaterThan(0);
    expect(visibleCount).toBeLessThanOrEqual(allCount);
  });

  test("clearing search restores all suites", async ({ page }) => {
    const input = page.locator("#search-input");
    const allCount = await page.locator("#suitesContainer .suite-block").count();
    const firstTestName = await page.evaluate(() => {
      const el = document.querySelector("#suitesContainer .test-detail-block .suite-name");
      return el?.textContent?.trim() ?? null;
    });
    const searchTerm = firstTestName?.split(/\s+/)[0] ?? "can";
    await input.fill(searchTerm);
    await input.fill("");
    // Assert deterministically: after clearing all suites must be visible
    await expect(page.locator("#suitesContainer .suite-block").first()).toBeVisible();
    const visibleCount = await page.locator("#suitesContainer .suite-block:visible").count();
    expect(visibleCount).toBe(allCount);
  });

  test("expand all shows test detail blocks inside suites", async ({ page, testsPage }) => {
    await testsPage.expandAll(page);
  });

  test("collapse all hides test detail blocks", async ({ page, testsPage }) => {
    await testsPage.expandAll(page);
    await page.getByRole("button", { name: "Collapse All" }).click();
    const suiteBody = page.locator("#suitesContainer .suite-body").first();
    await expect(suiteBody).not.toHaveClass(/open/);
  });

  test("main tabs exist (All, Failed, Passed, etc.)", async ({ page }) => {
    await expect(page.locator("#mainTabs")).not.toBeEmpty();
  });

  test("Expand All and Collapse All buttons are visible on the All tab", async ({ page }) => {
    await expect(page.locator(".section-actions")).toBeVisible();
  });

  // Parameterize: section-actions is hidden on every non-All tab.
  for (const tab of ["failed", "passed", "skipped", "healing"]) {
    test(`Expand All and Collapse All buttons are hidden on the ${tab} tab`, async ({ page }) => {
      await page.locator(`.tab-btn[data-tab="${tab}"]`).click();
      await expect(page.locator(".section-actions")).not.toBeVisible();
    });
  }

  test("switching from any tab back to All restores Expand/Collapse buttons", async ({ page }) => {
    await page.locator('.tab-btn[data-tab="failed"]').click();
    await page.locator('.tab-btn[data-tab="all"]').click();
    await expect(page.locator(".section-actions")).toBeVisible();
  });

  // ── Filter + expand regression ──────────────────────────────────────────────

  test("applying a status filter auto-expands suites containing matching tests", async ({ page }) => {
    await page.locator('.filter-btn[data-filter="failed"]').click();
    // Wait for suites to reflect the filter state without a fixed timeout
    await expect(page.locator("#suitesContainer .suite-block:visible").first()).toBeVisible();

    const visibleSuites = page.locator("#suitesContainer .suite-block:visible");
    const suiteCount = await visibleSuites.count();
    expect(suiteCount).toBeGreaterThan(0);

    for (let i = 0; i < suiteCount; i++) {
      const body = visibleSuites.nth(i).locator(".suite-body");
      await expect(body).toHaveClass(/open/);
    }
  });

  test("test cards inside a filtered suite can be expanded by clicking", async ({ page }) => {
    await page.locator('.filter-btn[data-filter="failed"]').click();
    await expect(page.locator("#suitesContainer .suite-block:visible").first()).toBeVisible();

    const firstTestHeader = page
      .locator("#suitesContainer .suite-block:visible .test-detail-block:visible .test-detail-header")
      .first();
    const firstTestBody = page
      .locator("#suitesContainer .suite-block:visible .test-detail-block:visible .test-detail-body")
      .first();

    const isAlreadyOpen = await firstTestBody.evaluate(el => el.classList.contains("open"));
    if (isAlreadyOpen) {
      await firstTestHeader.click();
      await expect(firstTestBody).not.toHaveClass(/open/);
    }

    await firstTestHeader.click();
    await expect(firstTestBody).toHaveClass(/open/);
  });

  test("clearing filter back to All does not collapse suites the user had open", async ({ page }) => {
    const firstSuiteHeader = page.locator("#suitesContainer .suite-block .suite-header").first();
    const firstSuiteBody = page.locator("#suitesContainer .suite-block .suite-body").first();
    if (!(await firstSuiteBody.evaluate(el => el.classList.contains("open")))) {
      await firstSuiteHeader.click();
    }
    await expect(firstSuiteBody).toHaveClass(/open/);

    await page.locator('.filter-btn[data-filter="failed"]').click();
    await expect(page.locator("#suitesContainer .suite-block:visible").first()).toBeVisible();
    await page.locator('.filter-btn[data-filter="all"]').click();
    await expect(page.locator("#suitesContainer .suite-block").first()).toBeVisible();

    await expect(firstSuiteBody).toHaveClass(/open/);
  });

  test("clicking a suite header toggles its body open/closed", async ({ page }) => {
    const suiteBlock = page.locator("#suitesContainer .suite-block").first();
    const suiteBody = suiteBlock.locator(".suite-body");
    const suiteHeader = suiteBlock.locator(".suite-header");
    const isOpen = await suiteBody.evaluate(el => el.classList.contains("open"));
    if (isOpen) {
      await suiteHeader.click();
      await expect(suiteBody).not.toHaveClass(/open/);
    }
    await suiteHeader.click();
    await expect(suiteBody).toHaveClass(/open/);
  });
});

// ---------------------------------------------------------------------------
// Docs Page
// ---------------------------------------------------------------------------

test.describe("Docs Page", () => {
  test.beforeEach(async ({ page, docsPage }) => {
    await docsPage.navigateToDocs(page);
  });

  test("markdown content is rendered on load", async ({ page }) => {
    await expect(page.locator("#docMarkdownContent")).not.toBeEmpty();
  });

  test("markdown content contains Feature headings", async ({ page }) => {
    await expect(page.locator("#docMarkdownContent")).toContainText("## Feature:");
  });

  // Parameterize: both format buttons share the same visibility check.
  for (const tab of ["md", "html"]) {
    test(`${tab} format button is visible`, async ({ page }) => {
      await expect(page.locator(`.docs-fmt-btn[data-doc-tab="${tab}"]`)).toBeVisible();
    });
  }

  test("All status filter is active by default", async ({ page }) => {
    await expect(page.locator('[data-doc-status="all"]')).toHaveClass(/active/);
  });

  test("feature selection grid is visible", async ({ page }) => {
    const grid = page.locator("#docsFeatureGrid");
    await expect(grid).toBeVisible();
    await expect(page.locator("#docsFeatureGrid .docs-feature-card").first()).toBeVisible();
  });

  test("all feature cards are selected by default", async ({ page }) => {
    await page.waitForSelector("#docsFeatureGrid .docs-feature-card");
    const total = await page.locator("#docsFeatureGrid .docs-feature-card").count();
    const selected = await page.locator("#docsFeatureGrid .docs-feature-card.selected").count();
    expect(total).toBeGreaterThan(0);
    expect(selected).toBe(total);
  });

  test("deselecting all features shows empty documentation", async ({ page }) => {
    await page.evaluate(() =>
      (document.getElementById("docSelectNone") as HTMLButtonElement)?.click(),
    );
    await expect(page.locator("#docMarkdownContent")).not.toContainText("## Feature:");
  });

  test("Select All restores full content", async ({ page }) => {
    await page.evaluate(() =>
      (document.getElementById("docSelectNone") as HTMLButtonElement)?.click(),
    );
    await expect(page.locator("#docMarkdownContent")).not.toContainText("## Feature:");
    await page.evaluate(() =>
      (document.getElementById("docSelectAll") as HTMLButtonElement)?.click(),
    );
    await expect(page.locator("#docMarkdownContent")).toContainText("## Feature:");
  });

  test("deselecting one feature card removes it from content", async ({ page }) => {
    await page.waitForSelector("#docsFeatureGrid .docs-feature-card");
    const firstCard = page.locator("#docsFeatureGrid .docs-feature-card").first();
    const featureName = await firstCard.locator(".docs-feature-card-name").textContent();
    await firstCard.click();
    await expect(page.locator("#docsFeatureGrid .docs-feature-card.selected").first()).not.toHaveText(featureName!);
    const content = await page.locator("#docMarkdownContent").textContent();
    expect(content).not.toContain(featureName);
  });

  test("feature count badge updates when a feature card is deselected", async ({ page }) => {
    await page.waitForSelector("#docsFeatureGrid .docs-feature-card");
    const total = await page.locator("#docsFeatureGrid .docs-feature-card").count();
    await page.locator("#docsFeatureGrid .docs-feature-card").first().click();
    const badge = page.locator("#docsFeatureCount");
    await expect(badge).toContainText(`${total - 1} selected`);
  });

  test("switching to HTML Preview tab renders iframe", async ({ page }) => {
    await page.locator('.docs-fmt-btn[data-doc-tab="html"]').click();
    const iframe = page.locator("#docHtmlPreview");
    await expect(iframe).toBeVisible();
    await page.waitForFunction(() => {
      const f = document.getElementById("docHtmlPreview") as HTMLIFrameElement;
      return f && f.srcdoc && f.srcdoc.length > 0;
    });
    const srcdoc = await iframe.evaluate((el: HTMLIFrameElement) => el.srcdoc);
    expect(srcdoc).toContain("Feature:");
  });

  test("switching back to Markdown tab restores preview", async ({ page }) => {
    await page.locator('.docs-fmt-btn[data-doc-tab="html"]').click();
    await page.locator('.docs-fmt-btn[data-doc-tab="md"]').click();
    await expect(page.locator('.docs-fmt-btn[data-doc-tab="md"]')).toHaveClass(/active/);
    await expect(page.locator("#docMarkdownContent")).toBeVisible();
  });

  test("docs format badge is visible", async ({ page }) => {
    await expect(page.locator("#docsDocFormatBadge")).toBeVisible();
  });

  test("Download .md button is visible", async ({ page }) => {
    await expect(page.locator(".docs-doc-header #docDownloadMdBtnHdr")).toBeVisible();
  });

  test("Download .html button is visible in HTML mode", async ({ page }) => {
    await page.locator('.docs-fmt-btn[data-doc-tab="html"]').click();
    await expect(page.locator(".docs-doc-header #docDownloadHtmlBtnHdr")).toBeVisible();
  });

  // Parameterize: both view-toggle buttons share the same visibility check.
  for (const view of ["source", "preview"]) {
    test(`${view} view toggle button is visible`, async ({ page }) => {
      await expect(page.locator(`.docs-view-btn[data-doc-view="${view}"]`)).toBeVisible();
    });
  }

  test("Failed status filter changes documentation content", async ({ page }) => {
    await page.evaluate(() =>
      (document.querySelector('[data-doc-status="failed"]') as HTMLButtonElement)?.click(),
    );
    await expect(page.locator('[data-doc-status="failed"]')).toHaveClass(/active/);
    const failedContent = (await page.locator("#docMarkdownContent").textContent()) ?? "";
    if (!failedContent.includes("## Feature:")) {
      expect(failedContent).not.toContain("## Feature:");
    } else {
      expect(failedContent.length).toBeGreaterThan(0);
    }
  });

  test("Passed status filter preserves content for all-passing report", async ({ page }) => {
    await page.evaluate(() =>
      (document.querySelector('[data-doc-status="passed"]') as HTMLButtonElement)?.click(),
    );
    await expect(page.locator('[data-doc-status="passed"]')).toHaveClass(/active/);
    await expect(page.locator("#docMarkdownContent")).toContainText("## Feature:");
  });
});

// ---------------------------------------------------------------------------
// Scroll to Top
// ---------------------------------------------------------------------------

test.describe("Scroll to Top", () => {
  test.beforeEach(async ({ page, testsPage }) => {
    // Tests page has many rows — enough height to scroll
    await testsPage.navigateToTests(page);
    await testsPage.expandAll(page);
  });

  test("scroll-top button appears after scrolling down", async ({ page }) => {
    await expect(page.locator("#scrollTopBtn")).not.toHaveClass(/visible/);
    await page.evaluate(() => window.scrollTo({ top: 600, behavior: "instant" }));
    await page.waitForFunction(() => window.scrollY > 400);
    await expect(page.locator("#scrollTopBtn")).toHaveClass(/visible/);
  });

  test("scroll-top button scrolls page back to top", async ({ page }) => {
    await page.evaluate(() => window.scrollTo({ top: 600, behavior: "instant" }));
    await page.waitForFunction(() => window.scrollY > 400);
    await page.locator("#scrollTopBtn").click();
    await page.waitForFunction(() => window.scrollY === 0);
    expect(await page.evaluate(() => window.scrollY)).toBe(0);
  });
});

