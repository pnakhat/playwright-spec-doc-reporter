import { test } from "@playwright/test";

/**
 * Set the Feature name and optional narrative for the current test.
 * Overrides the auto-extracted suite/file name in the BDD view and docs.
 *
 * ```ts
 * test('login with valid credentials', async ({ page }) => {
 *   addFeature('User Authentication', 'As a customer I want to log in to access my account');
 *   // ...
 * });
 * ```
 */
export function addFeature(name: string, description?: string): void {
  test.info().annotations.push({ type: "feature", description: name });
  if (description) {
    test.info().annotations.push({ type: "feature.description", description });
  }
}

/**
 * Add a scenario-level description (context / "As a user I want...") to the
 * current test. Appears under the scenario title in the BDD view and docs.
 *
 * ```ts
 * test('login with valid credentials', async ({ page }) => {
 *   addScenario('Verifies the happy-path login flow for a standard user');
 *   // ...
 * });
 * ```
 */
export function addScenario(description: string): void {
  test.info().annotations.push({ type: "scenario", description });
}

/**
 * Attach a high-level behaviour description to the current test.
 * These descriptions appear in the BDD view and Behaviour Documentation
 * instead of low-level Playwright step details.
 *
 * ```ts
 * test('login with valid credentials', async ({ page }) => {
 *   addBehaviour('User navigates to the login page');
 *   await page.goto('/login');
 *
 *   addBehaviour('User submits valid credentials');
 *   await page.fill('#email', 'user@example.com');
 *   await page.click('button[type="submit"]');
 *
 *   addBehaviour('User is redirected to the dashboard');
 *   await expect(page).toHaveURL('/dashboard');
 * });
 * ```
 */
export function addBehaviour(description: string): void {
  test.info().annotations.push({ type: "behaviour", description });
}

/**
 * Attach an API request to the current test so it appears inline in the HTML report.
 * Pair with `addApiResponse` immediately after the request is made.
 *
 * ```ts
 * const payload = { title: 'hello', userId: 1 };
 * addApiRequest('POST', `${baseURL}/posts`, payload);
 * const res = await request.post(`${baseURL}/posts`, { data: payload });
 * addApiResponse(res.status(), await res.json());
 * ```
 */
export function addApiRequest(method: string, url: string, body?: unknown, headers?: Record<string, string>): void {
  const entry = { kind: "request", method: method.toUpperCase(), url, body, headers };
  test.info().annotations.push({ type: "glossy:request", description: JSON.stringify(entry) });
}

/**
 * Attach an API response to the current test so it appears inline in the HTML report.
 */
export function addApiResponse(status: number, body?: unknown, headers?: Record<string, string>): void {
  const entry = { kind: "response", status, body, headers };
  test.info().annotations.push({ type: "glossy:response", description: JSON.stringify(entry) });
}
