import { describe, expect, it } from "vitest";
import { parseDiff } from "../src/healing/diffParser.js";

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function makeDiff(filePath: string, removedLines: string[], addedLines: string[]): string {
  return [
    `diff --git a/${filePath} b/${filePath}`,
    `--- a/${filePath}`,
    `+++ b/${filePath}`,
    "@@ -10,7 +10,7 @@",
    ...removedLines.map(l => `-${l}`),
    ...addedLines.map(l => `+${l}`),
  ].join("\n");
}

// ---------------------------------------------------------------------------
// parseDiff — basic
// ---------------------------------------------------------------------------

describe("parseDiff", () => {
  it("returns empty array for empty input", () => {
    expect(parseDiff("")).toEqual([]);
    expect(parseDiff("   \n  ")).toEqual([]);
  });

  it("ignores non-.spec.ts files", () => {
    const diff = makeDiff("tests/helpers/utils.ts", ["  const x = 1;"], ["  const x = 2;"]);
    expect(parseDiff(diff)).toHaveLength(0);
  });

  it("parses a single .spec.ts file diff", () => {
    const diff = makeDiff(
      "tests/login.spec.ts",
      ["  const btn = page.getByRole('button', { name: 'Old label' });"],
      ["  const btn = page.getByRole('button', { name: 'New label' });"],
    );
    const results = parseDiff(diff);
    expect(results).toHaveLength(1);
    expect(results[0].testFilePath).toBe("tests/login.spec.ts");
  });

  it("extracts locatorsBefore and locatorsAfter", () => {
    const diff = makeDiff(
      "tests/nav.spec.ts",
      ["  const link = page.getByRole('link', { name: 'More information' });"],
      ["  const link = page.getByRole('link', { name: 'Learn more' });"],
    );
    const [result] = parseDiff(diff);
    expect(result.locatorsBefore).toContain("link");
    expect(result.locatorsAfter).toContain("link");
  });

  it("extracts getByText, getByLabel, getByTestId locators", () => {
    const diff = makeDiff(
      "tests/form.spec.ts",
      [
        "  page.getByText('Submit');",
        "  page.getByLabel('Email');",
        "  page.getByTestId('submit-btn');",
      ],
      [
        "  page.getByText('Send');",
        "  page.getByLabel('Email address');",
        "  page.getByTestId('send-btn');",
      ],
    );
    const [result] = parseDiff(diff);
    expect(result.locatorsBefore).toEqual(["Submit", "Email", "submit-btn"]);
    expect(result.locatorsAfter).toEqual(["Send", "Email address", "send-btn"]);
  });

  it("extracts page.locator() strings", () => {
    const diff = makeDiff(
      "tests/sidebar.spec.ts",
      ["  page.locator('.old-selector');"],
      ["  page.locator('.new-selector');"],
    );
    const [result] = parseDiff(diff);
    expect(result.locatorsBefore).toContain(".old-selector");
    expect(result.locatorsAfter).toContain(".new-selector");
  });

  it("sets patchSummary to locator count when locators are found", () => {
    const diff = makeDiff(
      "tests/a.spec.ts",
      ["  page.getByRole('button', { name: 'Old' });"],
      ["  page.getByRole('button', { name: 'New' });"],
    );
    const [result] = parseDiff(diff);
    expect(result.patchSummary).toBe("1 locator updated");
  });

  it("sets patchSummary to hunk count when no locators are found", () => {
    const diff = makeDiff(
      "tests/a.spec.ts",
      ["  const x = 1;"],
      ["  const x = 2;"],
    );
    const [result] = parseDiff(diff);
    expect(result.patchSummary).toBe("1 hunk changed");
  });

  it("handles multiple locators in a single hunk", () => {
    const diff = makeDiff(
      "tests/multi.spec.ts",
      [
        "  page.getByRole('button', { name: 'A' });",
        "  page.getByRole('link', { name: 'B' });",
      ],
      [
        "  page.getByRole('button', { name: 'C' });",
        "  page.getByRole('link', { name: 'D' });",
      ],
    );
    const [result] = parseDiff(diff);
    expect(result.locatorsBefore).toHaveLength(2);
    expect(result.locatorsAfter).toHaveLength(2);
    expect(result.patchSummary).toBe("2 locators updated");
  });

  it("handles multiple .spec.ts files in one diff output", () => {
    const diff = [
      makeDiff(
        "tests/a.spec.ts",
        ["  page.getByRole('button', { name: 'Old A' });"],
        ["  page.getByRole('button', { name: 'New A' });"],
      ),
      makeDiff(
        "tests/b.spec.ts",
        ["  page.getByRole('link', { name: 'Old B' });"],
        ["  page.getByRole('link', { name: 'New B' });"],
      ),
    ].join("\n");

    const results = parseDiff(diff);
    expect(results).toHaveLength(2);
    expect(results.map(r => r.testFilePath)).toContain("tests/a.spec.ts");
    expect(results.map(r => r.testFilePath)).toContain("tests/b.spec.ts");
  });

  it("skips files with no hunks", () => {
    // A diff header with no actual hunk content
    const diff = [
      "diff --git a/tests/empty.spec.ts b/tests/empty.spec.ts",
      "--- a/tests/empty.spec.ts",
      "+++ b/tests/empty.spec.ts",
    ].join("\n");
    expect(parseDiff(diff)).toHaveLength(0);
  });
});
