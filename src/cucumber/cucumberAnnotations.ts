/**
 * API traffic annotation helpers for use inside @cucumber/cucumber step definitions.
 *
 * These are the Cucumber equivalent of addApiRequest / addApiResponse from the
 * main annotations module. Because @cucumber/cucumber steps run outside the
 * Playwright test runner, they cannot call test.info() — instead they attach
 * data via Cucumber's IWorld.attach() using special MIME types that the
 * glossy reporter's Cucumber adapter understands.
 *
 * Usage in step definitions (TypeScript):
 * ```ts
 * import { attachApiRequest, attachApiResponse } from "playwright-spec-doc-reporter/cucumber-annotations";
 *
 * When("I call the API", async function(this: ICustomWorld) {
 *   const url = "https://api.example.com/users";
 *   attachApiRequest(this, "GET", url);
 *   const res = await fetch(url);
 *   const body = await res.json();
 *   attachApiResponse(this, res.status, body);
 *   this.lastResponse = { status: res.status, body };
 * });
 * ```
 *
 * Usage in step definitions (JavaScript):
 * ```js
 * import { attachApiRequest, attachApiResponse } from "playwright-spec-doc-reporter/cucumber-annotations";
 *
 * When("I call the API", async function() {
 *   attachApiRequest(this, "GET", "https://api.example.com/users");
 *   const res = await fetch("https://api.example.com/users");
 *   const body = await res.json();
 *   attachApiResponse(this, res.status, body);
 * });
 * ```
 */

/**
 * Minimal interface covering the Cucumber World's attach method.
 */
export interface CucumberWorldLike {
  attach(data: string | Buffer, mediaType: string): void | Promise<void>;
}

/** MIME type used to identify API request attachments in Cucumber embeddings */
export const CUCUMBER_API_REQUEST_MIME = "application/json;type=glossy-api-request";

/** MIME type used to identify API response attachments in Cucumber embeddings */
export const CUCUMBER_API_RESPONSE_MIME = "application/json;type=glossy-api-response";

/**
 * Attach an API request to the current Cucumber scenario so it appears inline
 * in the glossy HTML report's API traffic section.
 *
 * @param world  - `this` inside a Cucumber step definition
 * @param method - HTTP method (GET, POST, PUT, etc.)
 * @param url    - Full request URL
 * @param body   - Optional request body
 * @param headers - Optional request headers
 */
export function attachApiRequest(
  world: CucumberWorldLike,
  method: string,
  url: string,
  body?: unknown,
  headers?: Record<string, string>
): void {
  const entry = { kind: "request", method: method.toUpperCase(), url, body, headers };
  world.attach(JSON.stringify(entry), CUCUMBER_API_REQUEST_MIME);
}

/**
 * Attach an API response to the current Cucumber scenario so it appears inline
 * in the glossy HTML report's API traffic section.
 *
 * @param world   - `this` inside a Cucumber step definition
 * @param status  - HTTP response status code
 * @param body    - Optional response body
 * @param headers - Optional response headers
 */
export function attachApiResponse(
  world: CucumberWorldLike,
  status: number,
  body?: unknown,
  headers?: Record<string, string>
): void {
  const entry = { kind: "response", status, body, headers };
  world.attach(JSON.stringify(entry), CUCUMBER_API_RESPONSE_MIME);
}
