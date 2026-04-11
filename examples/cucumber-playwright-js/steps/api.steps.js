import { When, Then } from "@cucumber/cucumber";
import assert from "node:assert";
import {
  attachApiRequest,
  attachApiResponse,
} from "playwright-spec-doc-reporter/cucumber-annotations";

When("I send a GET request to {string}", async function (path) {
  const url = `${this.apiBaseUrl}${path}`;
  attachApiRequest(this, "GET", url);
  const response = await fetch(url);
  const body = await response.json().catch(() => null);
  attachApiResponse(this, response.status, body);
  this.lastResponse = { status: response.status, body };
});

When("I send a POST request to {string} with body:", async function (path, docstring) {
  const url = `${this.apiBaseUrl}${path}`;
  const requestBody = JSON.parse(docstring);
  attachApiRequest(this, "POST", url, requestBody, { "Content-Type": "application/json" });
  const response = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: docstring,
  });
  const body = await response.json().catch(() => null);
  attachApiResponse(this, response.status, body);
  this.lastResponse = { status: response.status, body };
});

Then("the response status should be {int}", function (expectedStatus) {
  assert.strictEqual(
    this.lastResponse.status,
    expectedStatus,
    `Expected status ${expectedStatus} but got ${this.lastResponse.status}`
  );
});

Then("the response should contain at least {int} posts", function (minCount) {
  assert.ok(
    Array.isArray(this.lastResponse.body),
    "Expected response to be an array"
  );
  assert.ok(
    this.lastResponse.body.length >= minCount,
    `Expected at least ${minCount} posts but got ${this.lastResponse.body.length}`
  );
});

Then("the response body should have {string} field", function (field) {
  assert.ok(
    this.lastResponse.body !== null && typeof this.lastResponse.body === "object",
    "Expected response body to be an object"
  );
  assert.ok(
    field in this.lastResponse.body,
    `Expected response body to have field "${field}"`
  );
});
