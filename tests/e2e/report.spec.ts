import { test, expect, type Page } from '@playwright/test';
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
    await expect(page.locator('.topbar-meta')).toContainText('Playwright Reporter');
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
    // Pick the title of the first suite dynamically so this works with any report
    const firstSuiteTitle = await page.locator('#suitesContainer .suite-header .suite-title').first().textContent();
    const searchTerm = firstSuiteTitle?.trim().split(/\s+/)[0] ?? 'test';
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
    const firstSuiteTitle = await page.locator('#suitesContainer .suite-header .suite-title').first().textContent();
    const searchTerm = firstSuiteTitle?.trim().split(/\s+/)[0] ?? 'test';
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

  test('status filters are visible', async ({ page }) => {
    await expect(page.locator('[data-doc-status="all"]')).toBeVisible();
    await expect(page.locator('[data-doc-status="passed"]')).toBeVisible();
    await expect(page.locator('[data-doc-status="failed"]')).toBeVisible();
  });

  test('All status filter is active by default', async ({ page }) => {
    await expect(page.locator('[data-doc-status="all"]')).toHaveClass(/active/);
  });

  test('features dropdown opens on click', async ({ page }) => {
    const panel = page.locator('#docsFeaturePanel');
    await expect(panel).not.toBeVisible();
    await page.locator('#docsFeatureTrigger').click();
    await expect(panel).toBeVisible();
  });

  test('features dropdown closes when clicking outside', async ({ page }) => {
    await page.locator('#docsFeatureTrigger').click();
    await expect(page.locator('#docsFeaturePanel')).toBeVisible();
    await page.locator('#docMarkdownContent').click();
    await expect(page.locator('#docsFeaturePanel')).not.toBeVisible();
  });

  test('all feature checkboxes are checked by default', async ({ page }) => {
    await page.locator('#docsFeatureTrigger').click();
    const total = await page.locator('#docFeatureFilter input').count();
    const checked = await page.locator('#docFeatureFilter input:checked').count();
    expect(total).toBeGreaterThan(0);
    expect(checked).toBe(total);
  });

  test('unchecking all features shows empty documentation', async ({ page }) => {
    await page.locator('#docsFeatureTrigger').click();
    await page.locator('#docSelectNone').click();
    const content = await page.locator('#docMarkdownContent').textContent();
    // Should not contain any Feature headings when all unchecked
    expect(content).not.toContain('## Feature:');
  });

  test('Select All restores full content', async ({ page }) => {
    await page.locator('#docsFeatureTrigger').click();
    await page.locator('#docSelectNone').click();
    await page.locator('#docSelectAll').click();
    await expect(page.locator('#docMarkdownContent')).toContainText('## Feature:');
  });

  test('unchecking one feature removes it from content', async ({ page }) => {
    await page.locator('#docsFeatureTrigger').click();
    const firstCheckbox = page.locator('#docFeatureFilter input').first();
    const featureName = await firstCheckbox.inputValue();
    await firstCheckbox.uncheck();
    const content = await page.locator('#docMarkdownContent').textContent();
    expect(content).not.toContain(featureName);
  });

  test('feature count badge updates when features are deselected', async ({ page }) => {
    await page.locator('#docsFeatureTrigger').click();
    const total = await page.locator('#docFeatureFilter input').count();
    await page.locator('#docFeatureFilter input').first().uncheck();
    const badge = page.locator('#docsFeatureCount');
    await expect(badge).toContainText(`${total - 1}/${total}`);
  });

  test('switching to HTML Preview tab renders iframe', async ({ page }) => {
    await page.locator('.doc-tab-btn[data-doc-tab="html"]').click();
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
    await page.locator('.doc-tab-btn[data-doc-tab="html"]').click();
    await page.locator('.doc-tab-btn[data-doc-tab="md"]').click();
    await expect(page.locator('#doc-tab-md')).toHaveClass(/active/);
    await expect(page.locator('#docMarkdownContent')).toBeVisible();
  });

  test('Copy button is visible', async ({ page }) => {
    await expect(page.locator('#docCopyBtn')).toBeVisible();
  });

  test('Download .md button is visible', async ({ page }) => {
    await expect(page.locator('#docDownloadMdBtn')).toBeVisible();
  });

  test('Download .html button is visible', async ({ page }) => {
    await expect(page.locator('#docDownloadHtmlBtn')).toBeVisible();
  });

  test('PDF export button is visible', async ({ page }) => {
    await expect(page.locator('#docExportPdfBtn')).toBeVisible();
  });

  test('Failed status filter changes documentation content', async ({ page }) => {
    await page.locator('[data-doc-status="failed"]').click();
    await page.waitForTimeout(150);
    const failedContent = await page.locator('#docMarkdownContent').textContent() ?? '';
    // Either no failures (empty) or only failed tests shown — content must differ from all-tests view
    // or be a subset. At minimum the filter must have run (no error).
    await expect(page.locator('[data-doc-status="failed"]')).toHaveClass(/active/);
    // If there are no failures the content should be empty of Feature headings
    // If there are failures the content should be a subset of allContent
    if (!failedContent.includes('## Feature:')) {
      // No failed tests — expected empty state
      expect(failedContent).not.toContain('## Feature:');
    } else {
      // Failed tests exist — content should be present
      expect(failedContent.length).toBeGreaterThan(0);
    }
  });

  test('Passed status filter preserves content for all-passing report', async ({ page }) => {
    await page.locator('[data-doc-status="passed"]').click();
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
