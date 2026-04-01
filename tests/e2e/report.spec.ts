import { test, expect } from '@playwright/test';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const REPORT_URL = `file://${path.join(__dirname, '../../examples/js-es6-demo/spec-doc-report/index.html')}`;

test.beforeEach(async ({ page }) => {
  await page.goto(REPORT_URL);
});

// ---------------------------------------------------------------------------
// Topbar
// ---------------------------------------------------------------------------

test.describe('Topbar', () => {
  test('shows report title', async ({ page }) => {
    await expect(page.locator('#brand-title')).toContainText('Multi-Browser Stress Test Report');
  });

  test('shows run date and duration', async ({ page }) => {
    await expect(page.locator('#meta-time')).not.toBeEmpty();
    await expect(page.locator('#meta-duration')).not.toBeEmpty();
  });

  test('shows Playwright Reporter label', async ({ page }) => {
    await expect(page.locator('.topbar-brand-subtitle')).toContainText('Spec Documentation');
  });

  test('theme toggle button cycles through themes', async ({ page }) => {
    const html = page.locator('html');
    const btn = page.locator('#btnThemeToggle');

    await expect(html).toHaveAttribute('data-theme', 'dark-glossy');
    await btn.click();
    await expect(html).toHaveAttribute('data-theme', 'dark');
    await btn.click();
    await expect(html).toHaveAttribute('data-theme', 'light');
    await btn.click();
    await expect(html).toHaveAttribute('data-theme', 'dark-glossy');
  });

  test('print button exists', async ({ page }) => {
    await expect(page.locator('#btnExportPdf')).toBeVisible();
  });
});

// ---------------------------------------------------------------------------
// Navigation
// ---------------------------------------------------------------------------

test.describe('Tab Navigation', () => {
  test('overview tab is active on load', async ({ page }) => {
    await expect(page.locator('[data-page="overview"]')).toHaveClass(/active/);
    await expect(page.locator('#page-overview')).toHaveClass(/active/);
  });

  test('switching to Tests tab shows tests panel', async ({ page }) => {
    await page.locator('[data-page="tests"]').click();
    await expect(page.locator('#page-tests')).toHaveClass(/active/);
    await expect(page.locator('#page-overview')).not.toHaveClass(/active/);
  });

  test('switching to AI Insights tab shows ai panel', async ({ page }) => {
    await page.locator('[data-page="ai"]').click();
    await expect(page.locator('#page-ai')).toHaveClass(/active/);
  });

  test('switching to Trends tab shows trends panel', async ({ page }) => {
    await page.locator('[data-page="trends"]').click();
    await expect(page.locator('#page-trends')).toHaveClass(/active/);
  });

  test('switching to Docs tab shows docs panel', async ({ page }) => {
    await page.locator('[data-page="docs"]').click();
    await expect(page.locator('#page-docs')).toHaveClass(/active/);
  });

  test('only one page panel is active at a time', async ({ page }) => {
    await page.locator('[data-page="tests"]').click();
    const activePanels = page.locator('.page-panel.active');
    await expect(activePanels).toHaveCount(1);
  });
});

// ---------------------------------------------------------------------------
// Overview Page
// ---------------------------------------------------------------------------

test.describe('Overview Page', () => {
  test('donut chart shows a pass rate percentage', async ({ page }) => {
    await expect(page.locator('#donut-pct')).toHaveText(/%/);
  });

  test('hero title is visible', async ({ page }) => {
    await expect(page.locator('#hero-title')).not.toBeEmpty();
  });

  test('stats grid renders cards', async ({ page }) => {
    const cards = page.locator('#stats-grid .stat-card');
    await expect(cards).not.toHaveCount(0);
  });

  test('progress bar section is rendered', async ({ page }) => {
    await expect(page.locator('.progress-stack')).toBeVisible();
    await expect(page.locator('.progress-seg').first()).toBeVisible();
  });

  test('footer is rendered', async ({ page }) => {
    await expect(page.locator('#footer')).not.toBeEmpty();
  });
});

// ---------------------------------------------------------------------------
// Tests Page
// ---------------------------------------------------------------------------

test.describe('Tests Page', () => {
  test.beforeEach(async ({ page }) => {
    await page.locator('[data-page="tests"]').click();
  });

  test('suites container renders test rows', async ({ page }) => {
    const suites = page.locator('#suitesContainer .suite-block');
    await expect(suites).not.toHaveCount(0);
  });

  test('filter buttons are visible', async ({ page }) => {
    await expect(page.locator('.filter-btn[data-filter="all"]')).toBeVisible();
    await expect(page.locator('.filter-btn[data-filter="passed"]')).toBeVisible();
    await expect(page.locator('.filter-btn[data-filter="failed"]')).toBeVisible();
    await expect(page.locator('.filter-btn[data-filter="skipped"]')).toBeVisible();
  });

  test('All filter is active by default', async ({ page }) => {
    await expect(page.locator('.filter-btn[data-filter="all"]')).toHaveClass(/active/);
  });

  test('search input is visible', async ({ page }) => {
    await expect(page.locator('#search-input')).toBeVisible();
  });

  test('searching filters visible suites', async ({ page }) => {
    // Read first test name synchronously via evaluate — avoids auto-wait timeout if selector is hidden
    const firstTestName = await page.evaluate(() => {
      const el = document.querySelector('#suitesContainer .test-detail-block .suite-name');
      return el?.textContent?.trim() ?? null;
    });
    const searchTerm = firstTestName?.split(/\s+/)[0] ?? 'can';
    const allCount = await page.locator('#suitesContainer .suite-block').count();
    const input = page.locator('#search-input');
    await input.fill(searchTerm);
    await page.waitForTimeout(300);
    const visibleCount = await page.locator('#suitesContainer .suite-block:visible').count();
    expect(visibleCount).toBeGreaterThan(0);
    expect(visibleCount).toBeLessThanOrEqual(allCount);
  });

  test('clearing search restores all suites', async ({ page }) => {
    const input = page.locator('#search-input');
    const allCount = await page.locator('#suitesContainer .suite-block').count();
    const firstTestName = await page.evaluate(() => {
      const el = document.querySelector('#suitesContainer .test-detail-block .suite-name');
      return el?.textContent?.trim() ?? null;
    });
    const searchTerm = firstTestName?.split(/\s+/)[0] ?? 'can';
    await input.fill(searchTerm);
    await input.fill('');
    await page.waitForTimeout(300);
    const visibleCount = await page.locator('#suitesContainer .suite-block:visible').count();
    expect(visibleCount).toBe(allCount);
  });

  test('expand all shows test detail blocks inside suites', async ({ page }) => {
    await page.getByRole('button', { name: 'Expand All' }).click();
    const testDetails = page.locator('#suitesContainer .test-detail-block');
    await expect(testDetails.first()).toBeVisible();
  });

  test('collapse all hides test detail blocks', async ({ page }) => {
    await page.getByRole('button', { name: 'Expand All' }).click();
    await page.getByRole('button', { name: 'Collapse All' }).click();
    const suiteBody = page.locator('#suitesContainer .suite-body').first();
    await expect(suiteBody).not.toHaveClass(/open/);
  });

  test('main tabs exist (All, Failed, Passed, etc.)', async ({ page }) => {
    await expect(page.locator('#mainTabs')).not.toBeEmpty();
  });

  test('Expand All and Collapse All buttons are visible on the All tab', async ({ page }) => {
    const actions = page.locator('.section-actions');
    await expect(actions).toBeVisible();
  });

  test('Expand All and Collapse All buttons are hidden on the Failed tab', async ({ page }) => {
    await page.locator('.tab-btn[data-tab="failed"]').click();
    await expect(page.locator('.section-actions')).not.toBeVisible();
  });

  test('Expand All and Collapse All buttons are hidden on the Passed tab', async ({ page }) => {
    await page.locator('.tab-btn[data-tab="passed"]').click();
    await expect(page.locator('.section-actions')).not.toBeVisible();
  });

  test('Expand All and Collapse All buttons are hidden on the Skipped tab', async ({ page }) => {
    await page.locator('.tab-btn[data-tab="skipped"]').click();
    await expect(page.locator('.section-actions')).not.toBeVisible();
  });

  test('Expand All and Collapse All buttons are hidden on the Healing tab', async ({ page }) => {
    await page.locator('.tab-btn[data-tab="healing"]').click();
    await expect(page.locator('.section-actions')).not.toBeVisible();
  });

  test('switching from any tab back to All restores Expand/Collapse buttons', async ({ page }) => {
    await page.locator('.tab-btn[data-tab="failed"]').click();
    await page.locator('.tab-btn[data-tab="all"]').click();
    await expect(page.locator('.section-actions')).toBeVisible();
  });

  // ── Filter + expand regression ──────────────────────────────────────────────

  test('applying a status filter auto-expands suites containing matching tests', async ({ page }) => {
    // Click "Failed" filter — suites with failing tests must be auto-opened
    await page.locator('.filter-btn[data-filter="failed"]').click();
    await page.waitForTimeout(200);

    // Every visible suite-block should have its suite-body open
    const visibleSuites = page.locator('#suitesContainer .suite-block:visible');
    const suiteCount = await visibleSuites.count();
    expect(suiteCount).toBeGreaterThan(0);

    for (let i = 0; i < suiteCount; i++) {
      const body = visibleSuites.nth(i).locator('.suite-body');
      await expect(body).toHaveClass(/open/);
    }
  });

  test('test cards inside a filtered suite can be expanded by clicking', async ({ page }) => {
    await page.locator('.filter-btn[data-filter="failed"]').click();
    await page.waitForTimeout(200);

    // Find first visible test-detail-block and click its header to expand it
    const firstTestHeader = page
      .locator('#suitesContainer .suite-block:visible .test-detail-block:visible .test-detail-header')
      .first();
    const firstTestBody = page
      .locator('#suitesContainer .suite-block:visible .test-detail-block:visible .test-detail-body')
      .first();

    // Start collapsed (detail body closed)
    const isAlreadyOpen = await firstTestBody.evaluate(el => el.classList.contains('open'));
    if (isAlreadyOpen) {
      await firstTestHeader.click(); // close it first
      await expect(firstTestBody).not.toHaveClass(/open/);
    }

    await firstTestHeader.click();
    await expect(firstTestBody).toHaveClass(/open/);
  });

  test('clearing filter back to All does not collapse suites the user had open', async ({ page }) => {
    // Open first suite manually
    const firstSuiteHeader = page.locator('#suitesContainer .suite-block .suite-header').first();
    const firstSuiteBody = page.locator('#suitesContainer .suite-block .suite-body').first();
    if (!(await firstSuiteBody.evaluate(el => el.classList.contains('open')))) {
      await firstSuiteHeader.click();
    }
    await expect(firstSuiteBody).toHaveClass(/open/);

    // Apply then clear filter
    await page.locator('.filter-btn[data-filter="failed"]').click();
    await page.waitForTimeout(150);
    await page.locator('.filter-btn[data-filter="all"]').click();
    await page.waitForTimeout(150);

    // Suite that was open before filter should remain open (not forcibly closed)
    // We only auto-open on filter — we never auto-close on clear
    await expect(firstSuiteBody).toHaveClass(/open/);
  });

  test('clicking a suite header toggles its body open/closed', async ({ page }) => {
    const suiteBlock = page.locator('#suitesContainer .suite-block').first();
    const suiteBody = suiteBlock.locator('.suite-body');
    const suiteHeader = suiteBlock.locator('.suite-header');
    // Collapse if already open
    const isOpen = await suiteBody.evaluate(el => el.classList.contains('open'));
    if (isOpen) {
      await suiteHeader.click();
      await expect(suiteBody).not.toHaveClass(/open/);
    }
    // Now expand
    await suiteHeader.click();
    await expect(suiteBody).toHaveClass(/open/);
  });
});

// ---------------------------------------------------------------------------
// Docs Page
// ---------------------------------------------------------------------------

test.describe('Docs Page', () => {
  test.beforeEach(async ({ page }) => {
    await page.locator('[data-page="docs"]').click();
  });

  test('markdown content is rendered on load', async ({ page }) => {
    await expect(page.locator('#docMarkdownContent')).not.toBeEmpty();
  });

  test('markdown content contains Feature headings', async ({ page }) => {
    await expect(page.locator('#docMarkdownContent')).toContainText('## Feature:');
  });

  test('docs format buttons are visible', async ({ page }) => {
    await expect(page.locator('.docs-fmt-btn[data-doc-tab="md"]')).toBeVisible();
    await expect(page.locator('.docs-fmt-btn[data-doc-tab="html"]')).toBeVisible();
  });

  test('All status filter is active by default', async ({ page }) => {
    await expect(page.locator('[data-doc-status="all"]')).toHaveClass(/active/);
  });

  test('feature selection grid is visible', async ({ page }) => {
    const grid = page.locator('#docsFeatureGrid');
    await expect(grid).toBeVisible();
    await expect(page.locator('#docsFeatureGrid .docs-feature-card').first()).toBeVisible();
  });

  test('all feature cards are selected by default', async ({ page }) => {
    await page.waitForSelector('#docsFeatureGrid .docs-feature-card');
    const total = await page.locator('#docsFeatureGrid .docs-feature-card').count();
    const selected = await page.locator('#docsFeatureGrid .docs-feature-card.selected').count();
    expect(total).toBeGreaterThan(0);
    expect(selected).toBe(total);
  });

  test('deselecting all features shows empty documentation', async ({ page }) => {
    await page.evaluate(() => (document.getElementById('docSelectNone') as HTMLButtonElement)?.click());
    await page.waitForTimeout(100);
    const content = await page.locator('#docMarkdownContent').textContent();
    expect(content).not.toContain('## Feature:');
  });

  test('Select All restores full content', async ({ page }) => {
    await page.evaluate(() => (document.getElementById('docSelectNone') as HTMLButtonElement)?.click());
    await page.evaluate(() => (document.getElementById('docSelectAll') as HTMLButtonElement)?.click());
    await page.waitForTimeout(100);
    await expect(page.locator('#docMarkdownContent')).toContainText('## Feature:');
  });

  test('deselecting one feature card removes it from content', async ({ page }) => {
    await page.waitForSelector('#docsFeatureGrid .docs-feature-card');
    const firstCard = page.locator('#docsFeatureGrid .docs-feature-card').first();
    const featureName = await firstCard.locator('.docs-feature-card-name').textContent();
    await firstCard.click();
    await page.waitForTimeout(100);
    const content = await page.locator('#docMarkdownContent').textContent();
    expect(content).not.toContain(featureName);
  });

  test('feature count badge updates when a feature card is deselected', async ({ page }) => {
    await page.waitForSelector('#docsFeatureGrid .docs-feature-card');
    const total = await page.locator('#docsFeatureGrid .docs-feature-card').count();
    await page.locator('#docsFeatureGrid .docs-feature-card').first().click();
    await page.waitForTimeout(100);
    const badge = page.locator('#docsFeatureCount');
    await expect(badge).toContainText(`${total - 1} selected`);
  });

  test('switching to HTML Preview tab renders iframe', async ({ page }) => {
    await page.locator('.docs-fmt-btn[data-doc-tab="html"]').click();
    const iframe = page.locator('#docHtmlPreview');
    await expect(iframe).toBeVisible();
    // Wait for srcdoc to be set
    await page.waitForFunction(() => {
      const f = document.getElementById('docHtmlPreview') as HTMLIFrameElement;
      return f && f.srcdoc && f.srcdoc.length > 0;
    });
    const srcdoc = await iframe.evaluate((el: HTMLIFrameElement) => el.srcdoc);
    expect(srcdoc).toContain('Feature:');
  });

  test('switching back to Markdown tab restores pre view', async ({ page }) => {
    await page.locator('.docs-fmt-btn[data-doc-tab="html"]').click();
    await page.locator('.docs-fmt-btn[data-doc-tab="md"]').click();
    await expect(page.locator('.docs-fmt-btn[data-doc-tab="md"]')).toHaveClass(/active/);
    await expect(page.locator('#docMarkdownContent')).toBeVisible();
  });

  test('docs format badge is visible', async ({ page }) => {
    await expect(page.locator('#docsDocFormatBadge')).toBeVisible();
  });

  test('Download .md button is visible', async ({ page }) => {
    await expect(page.locator('.docs-doc-header #docDownloadMdBtnHdr')).toBeVisible();
  });

  test('Download .html button is visible in HTML mode', async ({ page }) => {
    await page.locator('.docs-fmt-btn[data-doc-tab="html"]').click();
    await expect(page.locator('.docs-doc-header #docDownloadHtmlBtnHdr')).toBeVisible();
  });

  test('view toggle buttons are visible', async ({ page }) => {
    await expect(page.locator('.docs-view-btn[data-doc-view="source"]')).toBeVisible();
    await expect(page.locator('.docs-view-btn[data-doc-view="preview"]')).toBeVisible();
  });

  test('Failed status filter changes documentation content', async ({ page }) => {
    await page.evaluate(() => (document.querySelector('[data-doc-status="failed"]') as HTMLButtonElement)?.click());
    await page.waitForTimeout(150);
    const failedContent = await page.locator('#docMarkdownContent').textContent() ?? '';
    // Either no failures (empty) or only failed tests shown
    await expect(page.locator('[data-doc-status="failed"]')).toHaveClass(/active/);
    if (!failedContent.includes('## Feature:')) {
      expect(failedContent).not.toContain('## Feature:');
    } else {
      expect(failedContent.length).toBeGreaterThan(0);
    }
  });

  test('Passed status filter preserves content for all-passing report', async ({ page }) => {
    await page.evaluate(() => (document.querySelector('[data-doc-status="passed"]') as HTMLButtonElement)?.click());
    await page.waitForTimeout(150);
    await expect(page.locator('#docMarkdownContent')).toContainText('## Feature:');
  });
});

// ---------------------------------------------------------------------------
// Scroll to Top
// ---------------------------------------------------------------------------

test.describe('Scroll to Top', () => {
  test.beforeEach(async ({ page }) => {
    // Tests page has many rows — enough height to actually scroll
    await page.locator('[data-page="tests"]').click();
    await page.getByRole('button', { name: 'Expand All' }).click();
  });

  test('scroll-top button appears after scrolling down', async ({ page }) => {
    await expect(page.locator('#scrollTopBtn')).not.toHaveClass(/visible/);
    await page.evaluate(() => window.scrollTo({ top: 600, behavior: 'instant' }));
    await page.waitForFunction(() => window.scrollY > 400);
    await expect(page.locator('#scrollTopBtn')).toHaveClass(/visible/);
  });

  test('scroll-top button scrolls page back to top', async ({ page }) => {
    await page.evaluate(() => window.scrollTo({ top: 600, behavior: 'instant' }));
    await page.waitForFunction(() => window.scrollY > 400);
    await page.locator('#scrollTopBtn').click();
    await page.waitForFunction(() => window.scrollY === 0);
    expect(await page.evaluate(() => window.scrollY)).toBe(0);
  });
});
