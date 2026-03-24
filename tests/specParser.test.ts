import { describe, expect, it } from "vitest";
import { parseMarkdown } from "../src/traceability/specParser.js";

// ---------------------------------------------------------------------------
// parseMarkdown
// ---------------------------------------------------------------------------

describe("parseMarkdown", () => {
  it("extracts title from the first # heading", () => {
    const content = `# Smoke Tests\n\nSome intro.\n\n## Homepage loads successfully\n`;
    const result = parseMarkdown(content, "specs/smoke.md");
    expect(result.title).toBe("Smoke Tests");
  });

  it("extracts all ## scenario headings", () => {
    const content = `# Login\n\n## Valid credentials login\n\n## Invalid password shows error\n\n## Locked out user is redirected\n`;
    const result = parseMarkdown(content, "specs/login.md");
    expect(result.scenarios).toEqual([
      "Valid credentials login",
      "Invalid password shows error",
      "Locked out user is redirected",
    ]);
  });

  it("ignores deeper headings (###, ####)", () => {
    const content = `# Feature\n\n## Scenario A\n\n### Sub-step\n\n#### Details\n`;
    const result = parseMarkdown(content, "specs/feature.md");
    expect(result.scenarios).toEqual(["Scenario A"]);
  });

  it("uses filePath as title fallback when no # heading found", () => {
    const content = `## Only scenarios here\n`;
    const result = parseMarkdown(content, "specs/orphan.md");
    expect(result.title).toBe("specs/orphan.md");
  });

  it("returns empty scenarios array when no ## headings found", () => {
    const content = `# Title\n\nJust a paragraph.\n`;
    const result = parseMarkdown(content, "specs/empty.md");
    expect(result.scenarios).toEqual([]);
  });

  it("sets filePath on the result", () => {
    const content = `# Test\n`;
    const result = parseMarkdown(content, "specs/sub/nested.md");
    expect(result.filePath).toBe("specs/sub/nested.md");
  });

  it("handles content with no headings at all", () => {
    const content = `Just plain text without any heading markers.\n`;
    const result = parseMarkdown(content, "specs/plain.md");
    expect(result.title).toBe("specs/plain.md");
    expect(result.scenarios).toEqual([]);
  });

  it("trims whitespace from extracted titles and scenarios", () => {
    const content = `#   Padded Title   \n\n##   Padded Scenario   \n`;
    const result = parseMarkdown(content, "specs/padded.md");
    expect(result.title).toBe("Padded Title");
    expect(result.scenarios).toEqual(["Padded Scenario"]);
  });

  it("uses the first # heading when multiple exist", () => {
    const content = `# First Title\n\n# Second Title\n`;
    const result = parseMarkdown(content, "specs/multi.md");
    expect(result.title).toBe("First Title");
  });

  it("parses a realistic smoke.md spec file", () => {
    const content = [
      "# Smoke Tests",
      "",
      "High-level smoke checks to verify the application is running.",
      "",
      "## Homepage loads successfully",
      "",
      "Verify the application homepage responds and displays the expected content.",
      "",
      "## Navigation works end-to-end",
      "",
      "Ensure all primary navigation links are reachable and return valid pages.",
    ].join("\n");

    const result = parseMarkdown(content, "specs/smoke.md");
    expect(result.title).toBe("Smoke Tests");
    expect(result.scenarios).toEqual([
      "Homepage loads successfully",
      "Navigation works end-to-end",
    ]);
    expect(result.filePath).toBe("specs/smoke.md");
  });
});
