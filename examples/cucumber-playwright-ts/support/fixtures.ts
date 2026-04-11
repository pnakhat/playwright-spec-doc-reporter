/**
 * Custom Playwright fixtures for playwright-bdd.
 * Replaces @cucumber/cucumber's World class.
 */
import { test as base, createBdd } from "playwright-bdd";
import type { TestInfo } from "@playwright/test";

/**
 * Helper to push a glossy:request annotation onto testInfo.
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

/**
 * Helper to push a glossy:response annotation onto testInfo.
 */
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

/**
 * Custom fixture type — add project-level helpers here.
 */
export type Fixtures = {
  baseUrl: string;
  /** Annotate an API request so it appears inline in the glossy report */
  apiRequest: (method: string, url: string, body?: unknown, headers?: Record<string, string>) => void;
  /** Annotate an API response so it appears inline in the glossy report */
  apiResponse: (status: number, body?: unknown, headers?: Record<string, string>) => void;
};

export const test = base.extend<Fixtures>({
  baseUrl: async ({}, use) => {
    await use(process.env.BASE_URL ?? "https://www.saucedemo.com");
  },
  apiRequest: async ({}, use, testInfo) => {
    await use((method, url, body?, headers?) => pushApiRequest(testInfo, method, url, body, headers));
  },
  apiResponse: async ({}, use, testInfo) => {
    await use((status, body?, headers?) => pushApiResponse(testInfo, status, body, headers));
  },
});

/**
 * Export the BDD step helpers bound to our custom fixtures.
 * Step definitions must import from here (not from playwright-bdd directly)
 * so that custom fixtures (baseUrl, apiRequest, apiResponse, etc.) are available.
 */
export const { Given, When, Then, Before, After } = createBdd(test);
