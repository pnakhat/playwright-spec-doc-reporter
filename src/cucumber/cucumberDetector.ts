/**
 * Cucumber test detector and metadata extractor for playwright-bdd tests.
 *
 * When tests are generated from Gherkin feature files (via playwright-bdd or
 * similar), Playwright test titles and annotations carry feature/scenario info.
 * This module detects that pattern and extracts structured Cucumber metadata.
 *
 * Supported integrations:
 *  - playwright-bdd: generates Playwright tests from .feature files
 *  - @cucumber/playwright: wraps Cucumber scenarios as Playwright tests
 *  - Manual BDD: tests annotated with feature/scenario/behaviour annotations
 */

import type { TestCase } from "@playwright/test/reporter";

/**
 * Metadata extracted from a Cucumber-flavored Playwright test.
 */
export interface CucumberTestMeta {
  /** Whether this test was detected as a Cucumber/BDD scenario */
  isCucumber: boolean;
  /** Feature name from annotation or title */
  featureName?: string;
  /** Feature description / narrative */
  featureDescription?: string;
  /** Scenario name from annotation or title */
  scenarioName?: string;
  /** Gherkin tags (including @cucumber) */
  tags: string[];
  /** Path to the .feature file if available */
  featureFilePath?: string;
  /** Rule name if scenario is inside a Rule block */
  ruleName?: string;
}

/**
 * playwright-bdd injects these annotation types.
 * See: https://vitalets.github.io/playwright-bdd/
 */
const PLAYWRIGHT_BDD_ANNOTATION_TYPES = new Set([
  "feature",
  "scenario",
  "rule",
  "feature.description",
  "story",          // some BDD libs use "story"
  "given",
  "when",
  "then",
]);

/**
 * Patterns that suggest a test title follows Cucumber format.
 * e.g. "Feature > Scenario", "Feature: Name > Scenario: Name"
 */
const CUCUMBER_TITLE_PATTERNS = [
  /^.+\s*[>›]\s*.+$/,                   // "Feature > Scenario"
  /^Feature:\s*(.+)/i,                   // "Feature: …"
  /^Scenario:\s*(.+)/i,                  // "Scenario: …"
  /^Scenario Outline:\s*(.+)/i,          // "Scenario Outline: …"
];

/**
 * Tags that indicate Cucumber/BDD context.
 */
const CUCUMBER_TAG_INDICATORS = new Set(["@cucumber", "@bdd", "@gherkin"]);

/**
 * File path patterns that identify playwright-bdd generated test files.
 * playwright-bdd writes generated specs into .features-gen/ by default.
 */
const PLAYWRIGHT_BDD_FILE_PATTERNS = [
  /[/\\]\.features-gen[/\\]/,         // default playwright-bdd output dir
  /\.feature\.spec\.[jt]s$/,          // common naming: login.feature.spec.ts
  /[/\\]features-gen[/\\]/,           // alternative without leading dot
];

/**
 * Detect whether a Playwright test was generated from a Cucumber feature file.
 */
export function isCucumberTest(test: TestCase): boolean {
  // File path detection — playwright-bdd writes to .features-gen/
  const filePath = test.location?.file ?? "";
  for (const pattern of PLAYWRIGHT_BDD_FILE_PATTERNS) {
    if (pattern.test(filePath)) return true;
  }

  // Annotation-based detection (playwright-bdd sets these)
  for (const ann of test.annotations) {
    if (PLAYWRIGHT_BDD_ANNOTATION_TYPES.has(ann.type)) return true;
  }

  // Tag-based detection
  const tags = Array.isArray((test as unknown as { tags?: string[] }).tags)
    ? (test as unknown as { tags: string[] }).tags
    : [];
  for (const tag of tags) {
    if (CUCUMBER_TAG_INDICATORS.has(tag) || CUCUMBER_TAG_INDICATORS.has(`@${tag}`)) {
      return true;
    }
  }

  // Title-based detection
  for (const pattern of CUCUMBER_TITLE_PATTERNS) {
    if (pattern.test(test.title)) return true;
  }

  // Parent suite title detection
  let parent: import("@playwright/test/reporter").Suite | undefined = test.parent;
  while (parent) {
    if (/^Feature:/i.test(parent.title) || /^Rule:/i.test(parent.title)) {
      return true;
    }
    parent = parent.parent;
  }

  return false;
}

/**
 * Extract Cucumber-specific metadata from a Playwright test.
 */
export function extractCucumberMeta(test: TestCase): CucumberTestMeta {
  if (!isCucumberTest(test)) {
    return { isCucumber: false, tags: [] };
  }

  // Extract from annotations (playwright-bdd pattern)
  const featureAnn = test.annotations.find(a => a.type === "feature");
  const featureDescAnn = test.annotations.find(a => a.type === "feature.description");
  const scenarioAnn = test.annotations.find(a => a.type === "scenario");
  const ruleAnn = test.annotations.find(a => a.type === "rule");

  // Fallback: parse feature/scenario from suite hierarchy
  let featureName = featureAnn?.description;
  let scenarioName = scenarioAnn?.description ?? test.title;

  if (!featureName) {
    // Walk up the parent chain looking for "Feature: …" title
    let parent: import("@playwright/test/reporter").Suite | undefined = test.parent;
    while (parent) {
      if (/^Feature:/i.test(parent.title)) {
        featureName = parent.title.replace(/^Feature:\s*/i, "").trim();
        break;
      }
      if (parent.title && !featureName) {
        featureName = parent.title;
      }
      parent = parent.parent;
    }
  }

  // Also try parsing "Feature > Scenario" format from title path
  if (!featureName && test.titlePath().length >= 2) {
    const path = test.titlePath();
    featureName = path[path.length - 2];
    scenarioName = path[path.length - 1];
  }

  // Collect all tags
  const tagSet = new Set<string>();
  tagSet.add("@cucumber");

  const testTags = Array.isArray((test as unknown as { tags?: string[] }).tags)
    ? (test as unknown as { tags: string[] }).tags
    : [];
  for (const t of testTags) {
    tagSet.add(t.startsWith("@") ? t : `@${t}`);
  }

  // Extract @tags from test annotations
  for (const ann of test.annotations) {
    if (ann.type === "tag" && ann.description) {
      tagSet.add(ann.description.startsWith("@") ? ann.description : `@${ann.description}`);
    }
  }

  // Extract @tags from title
  const titleTags = test.title.match(/@[\w-]+/g) ?? [];
  for (const t of titleTags) tagSet.add(t);

  // Feature file path from annotation (playwright-bdd adds this)
  const fileAnn = test.annotations.find(
    a => a.type === "pwbdd:feature" || a.type === "featureFile"
  );

  return {
    isCucumber: true,
    featureName: featureName || "Unknown Feature",
    featureDescription: featureDescAnn?.description,
    scenarioName,
    tags: [...tagSet],
    featureFilePath: fileAnn?.description,
    ruleName: ruleAnn?.description,
  };
}

/**
 * Extract Gherkin step keyword from a test step title.
 * Returns the keyword and remaining step text.
 */
export function parseGherkinStepTitle(title: string): {
  keyword: string | null;
  text: string;
} {
  const match = title.match(/^(Given|When|Then|And|But)\s+(.+)/i);
  if (match) {
    return { keyword: match[1], text: match[2] };
  }
  return { keyword: null, text: title };
}

/**
 * Determine the display category for a Gherkin step keyword.
 * Used for step timeline coloring in the report.
 */
export function gherkinStepCategory(keyword: string | null): string {
  if (!keyword) return "test";
  switch (keyword.toLowerCase()) {
    case "given": return "given";
    case "when": return "when";
    case "then": return "then";
    case "and":
    case "but": return "and";
    default: return "test";
  }
}
