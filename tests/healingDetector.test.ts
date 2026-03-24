import { describe, expect, it } from "vitest";
import { detectHealingEvent } from "../src/healing/healingDetector.js";
import type { TestResult } from "@playwright/test/reporter";
import type { HealingDiff } from "../src/healing/diffParser.js";

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function makeResult(
  status: TestResult["status"],
  annotations: Array<{ type: string; description?: string }> = [],
): TestResult {
  return {
    status,
    annotations,
    attachments: [],
    duration: 100,
    errors: [],
    parallelIndex: 0,
    retry: 0,
    startTime: new Date(),
    stderr: [],
    stdout: [],
    steps: [],
    workerIndex: 0,
  } as unknown as TestResult;
}

function makeDiff(testFilePath: string): HealingDiff {
  return {
    testFilePath,
    hunks: [{ removedLines: ["  page.getByRole('button', { name: 'Old' });"], addedLines: ["  page.getByRole('button', { name: 'New' });"] }],
    locatorsBefore: ["button"],
    locatorsAfter: ["button"],
    patchSummary: "1 locator updated",
  };
}

// ---------------------------------------------------------------------------
// detectHealingEvent
// ---------------------------------------------------------------------------

describe("detectHealingEvent", () => {
  it("returns null when test passed with no healer annotation and no diff", () => {
    const result = makeResult("passed");
    expect(detectHealingEvent("tests/a.spec.ts", result)).toBeNull();
  });

  it("returns null when test failed with no healer evidence", () => {
    const result = makeResult("failed");
    expect(detectHealingEvent("tests/a.spec.ts", result)).toBeNull();
  });

  it("returns null when test skipped with no healer annotation", () => {
    const result = makeResult("skipped");
    expect(detectHealingEvent("tests/a.spec.ts", result)).toBeNull();
  });

  it("detects auto-healed when test passed and has healer annotation", () => {
    const result = makeResult("passed", [{ type: "healer", description: "locator fixed" }]);
    const event = detectHealingEvent("tests/a.spec.ts", result);
    expect(event).not.toBeNull();
    expect(event!.outcome).toBe("auto-healed");
    expect(event!.reason).toBe("locator fixed");
    expect(event!.testFilePath).toBe("tests/a.spec.ts");
  });

  it("detects auto-healed when test passed and file is in diff index (no annotation)", () => {
    const result = makeResult("passed");
    const diffIndex = new Map([["tests/a.spec.ts", makeDiff("tests/a.spec.ts")]]);
    const event = detectHealingEvent("tests/a.spec.ts", result, diffIndex);
    expect(event).not.toBeNull();
    expect(event!.outcome).toBe("auto-healed");
  });

  it("attaches diff data when file is in diff index", () => {
    const result = makeResult("passed");
    const diff = makeDiff("tests/a.spec.ts");
    const diffIndex = new Map([["tests/a.spec.ts", diff]]);
    const event = detectHealingEvent("tests/a.spec.ts", result, diffIndex);
    expect(event!.diff).toBe(diff);
  });

  it("detects skipped-app-broken when test skipped and has healer annotation", () => {
    const result = makeResult("skipped", [
      { type: "healer", description: "element not found — skipping" },
    ]);
    const event = detectHealingEvent("tests/nav.spec.ts", result);
    expect(event).not.toBeNull();
    expect(event!.outcome).toBe("skipped-app-broken");
    expect(event!.reason).toBe("element not found — skipping");
  });

  it("does NOT detect auto-healed for a failed test even with diff", () => {
    const result = makeResult("failed");
    const diffIndex = new Map([["tests/a.spec.ts", makeDiff("tests/a.spec.ts")]]);
    expect(detectHealingEvent("tests/a.spec.ts", result, diffIndex)).toBeNull();
  });

  it("does NOT detect skipped-app-broken for a passed test with healer annotation", () => {
    // passed + healer annotation → auto-healed, not skipped-app-broken
    const result = makeResult("passed", [{ type: "healer" }]);
    const event = detectHealingEvent("tests/a.spec.ts", result);
    expect(event!.outcome).toBe("auto-healed");
  });

  it("ignores non-healer annotation types", () => {
    const result = makeResult("skipped", [{ type: "issue", description: "PW-123" }]);
    expect(detectHealingEvent("tests/a.spec.ts", result)).toBeNull();
  });

  it("returns null when file path not in diff index (no annotation)", () => {
    const result = makeResult("passed");
    const diffIndex = new Map([["tests/other.spec.ts", makeDiff("tests/other.spec.ts")]]);
    expect(detectHealingEvent("tests/a.spec.ts", result, diffIndex)).toBeNull();
  });
});
