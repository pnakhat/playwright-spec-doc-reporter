/**
 * Annotation helpers for Glossy reporter — uses the local @playwright/test.
 * Import this file in your specs instead of importing from the reporter package
 * directly, to avoid a double-playwright-instance conflict.
 */
import { test } from "@playwright/test";

export function addFeature(name, description) {
  test.info().annotations.push({ type: "feature", description: name });
  if (description) {
    test.info().annotations.push({ type: "feature.description", description });
  }
}

export function addScenario(description) {
  test.info().annotations.push({ type: "scenario", description });
}

export function addBehaviour(description) {
  test.info().annotations.push({ type: "behaviour", description });
}

export function addApiRequest(method, url, body, headers) {
  const entry = { kind: "request", method: method.toUpperCase(), url, body, headers };
  test.info().annotations.push({ type: "glossy:request", description: JSON.stringify(entry) });
}

export function addApiResponse(status, body, headers) {
  const entry = { kind: "response", status, body, headers };
  test.info().annotations.push({ type: "glossy:response", description: JSON.stringify(entry) });
}
