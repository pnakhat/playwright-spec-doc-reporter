// spec: specs/login.md
// seed: tests/login-seed.spec.ts
import { test, expect } from '@playwright/test';

/**
 * HEALER SIMULATION — auto-healed outcome
 *
 * Original (broken) generated test had:
 *   page.getByRole('button', { name: 'Sign in' })
 *
 * The Playwright Healer agent detected the locator was stale (button text
 * changed from "Sign in" to "More information"), ran candidate selectors,
 * and automatically patched the test file.
 *
 * The annotation below is injected by the Healer after a successful patch.
 * Outcome: test now PASSES → reported as amber "Auto-healed" badge.
 */

test('Login page loads with title', async ({ page }) => {
  await page.goto('https://example.com');
  await expect(page).toHaveTitle(/Example Domain/);
});

test('Submit button is visible on the page', async ({ page }) => {
  // Healer agent annotation — injected after auto-patching the locator
  test.info().annotations.push({
    type: 'healer',
    description:
      "page.getByRole('link', { name: 'Sign in' }) was stale. " +
      "Healer tried 3 candidate selectors and matched page.getByRole('link', { name: 'Learn more' }). " +
      "Test file patched automatically and re-run successfully.",
  });

  await page.goto('https://example.com');
  // Patched locator — what the Healer replaced the broken one with
  const cta = page.getByRole('link', { name: 'Learn more' });
  await expect(cta).toBeVisible();
});
