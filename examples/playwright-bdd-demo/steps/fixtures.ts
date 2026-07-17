/**
 * Custom Playwright fixtures for playwright-bdd.
 *
 * Step definitions must import Given/When/Then from here (not from
 * playwright-bdd directly) so the custom fixtures are available.
 */
import { test as base, createBdd } from "playwright-bdd";
import type { TestInfo } from "@playwright/test";

/**
 * Annotation helpers — the glossy reporter renders glossy:request /
 * glossy:response annotations as an inline API viewer per test.
 */
function pushApiRequest(
  testInfo: TestInfo,
  method: string,
  url: string,
  body?: unknown,
  headers?: Record<string, string>
): void {
  testInfo.annotations.push({
    type: "glossy:request",
    description: JSON.stringify({ kind: "request", method: method.toUpperCase(), url, body, headers }),
  });
}

function pushApiResponse(
  testInfo: TestInfo,
  status: number,
  body?: unknown,
  headers?: Record<string, string>
): void {
  testInfo.annotations.push({
    type: "glossy:response",
    description: JSON.stringify({ kind: "response", status, body, headers }),
  });
}

export type Fixtures = {
  /** Annotate an API request so it appears inline in the glossy report */
  apiRequest: (method: string, url: string, body?: unknown, headers?: Record<string, string>) => void;
  /** Annotate an API response so it appears inline in the glossy report */
  apiResponse: (status: number, body?: unknown, headers?: Record<string, string>) => void;
};

export const test = base.extend<Fixtures>({
  apiRequest: async ({}, use, testInfo) => {
    await use((method, url, body?, headers?) => pushApiRequest(testInfo, method, url, body, headers));
  },
  apiResponse: async ({}, use, testInfo) => {
    await use((status, body?, headers?) => pushApiResponse(testInfo, status, body, headers));
  },
});

export const { Given, When, Then } = createBdd(test);
