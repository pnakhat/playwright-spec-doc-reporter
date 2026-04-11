import { expect } from "@playwright/test";
import { Given, When, Then } from "../support/fixtures.js";

// Store last response on a per-test basis via a simple closure approach.
// playwright-bdd runs each step inside the same Playwright test worker so we
// can use a module-level map keyed by worker index (or a simple variable since
// steps run sequentially within one test).
let lastResponse: { status: number; body: unknown } | null = null;

When(
  "I send a GET request to {string}",
  async ({ apiRequest, apiResponse }, url: string) => {
    apiRequest("GET", url);
    const res = await fetch(url);
    const body = await res.json().catch(() => null);
    apiResponse(res.status, body);
    lastResponse = { status: res.status, body };
  }
);

When(
  "I send a POST request to {string} with JSON body:",
  async ({ apiRequest, apiResponse }, url: string, dataTable: { hashes: () => Record<string, string>[] }) => {
    // DataTable comes in as rows with "key" | "value" columns or as a simple
    // two-column table — we normalise it into a plain object.
    const rows = (dataTable as unknown as { rawTable: string[][] }).rawTable;
    const bodyObj: Record<string, unknown> = {};
    for (const [key, value] of rows) {
      // Coerce numeric strings
      bodyObj[key] = isNaN(Number(value)) ? value : Number(value);
    }

    apiRequest("POST", url, bodyObj, { "Content-Type": "application/json" });

    const res = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(bodyObj),
    });
    const body = await res.json().catch(() => null);
    apiResponse(res.status, body, { "Content-Type": res.headers.get("content-type") ?? "" });
    lastResponse = { status: res.status, body };
  }
);

Then("the response status should be {int}", async ({}, expectedStatus: number) => {
  expect(lastResponse?.status).toBe(expectedStatus);
});

Then(
  "the response should be an array with at least {int} items",
  async ({}, minCount: number) => {
    expect(Array.isArray(lastResponse?.body)).toBe(true);
    expect((lastResponse?.body as unknown[]).length).toBeGreaterThanOrEqual(minCount);
  }
);

Then(
  "the response body should contain field {string}",
  async ({}, field: string) => {
    expect(lastResponse?.body).toBeTruthy();
    expect(lastResponse?.body).toHaveProperty(field);
  }
);

Then(
  "each item in the response should contain field {string}",
  async ({}, field: string) => {
    expect(Array.isArray(lastResponse?.body)).toBe(true);
    for (const item of lastResponse?.body as Record<string, unknown>[]) {
      expect(item).toHaveProperty(field);
    }
  }
);
