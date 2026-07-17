import { describe, expect, it, beforeEach, afterEach } from "vitest";
import * as fs from "node:fs";
import * as os from "node:os";
import * as path from "node:path";
import type { TestCase } from "@playwright/test/reporter";
import { enrichBddTest, readGeneratedFromHeader, clearBddEnricherCache } from "../src/cucumber/bddEnricher.js";
import { clearFeatureCache } from "../src/cucumber/featureParser.js";

const FEATURE_SOURCE = `@smoke @DEMO-1
Feature: Demo Feature
  As a tester
  I want enriched reports

  Background:
    Given a background step

  @positive
  Scenario: First scenario
    Happy-path description.

    When I do something with "value"
    Then it should work

  Rule: Business rule

    @outline
    Scenario Outline: Outline scenario
      When I do something with "<input>"
      Then it should work

      Examples:
        | input |
        | a     |
        | b     |
`;

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

let projectRoot: string;
let generatedSpecPath: string;

function writeProject(): void {
  projectRoot = fs.mkdtempSync(path.join(os.tmpdir(), "glossy-bdd-"));
  const featuresDir = path.join(projectRoot, "features");
  const genDir = path.join(projectRoot, ".features-gen", "features");
  fs.mkdirSync(featuresDir, { recursive: true });
  fs.mkdirSync(genDir, { recursive: true });
  fs.writeFileSync(path.join(featuresDir, "demo.feature"), FEATURE_SOURCE);
  generatedSpecPath = path.join(genDir, "demo.feature.spec.js");
  fs.writeFileSync(
    generatedSpecPath,
    '// Generated from: features/demo.feature\nimport { test } from "playwright-bdd";\n'
  );
}

function makeTestCase(overrides: {
  title: string;
  parentTitle?: string;
  grandparentTitle?: string;
  filePath?: string;
}): TestCase {
  const grandparent = overrides.grandparentTitle
    ? { title: overrides.grandparentTitle, parent: undefined }
    : undefined;
  const parent = {
    title: overrides.parentTitle ?? "Demo Feature",
    parent: grandparent,
    project: () => undefined,
  };
  const titles = [
    overrides.grandparentTitle,
    overrides.parentTitle ?? "Demo Feature",
    overrides.title,
  ].filter(Boolean) as string[];
  return {
    title: overrides.title,
    location: { file: overrides.filePath ?? generatedSpecPath, line: 1, column: 1 },
    annotations: [],
    tags: [],
    parent,
    titlePath: () => titles,
    expectedStatus: "passed",
  } as unknown as TestCase;
}

beforeEach(() => {
  writeProject();
});

afterEach(() => {
  clearBddEnricherCache();
  clearFeatureCache();
  fs.rmSync(projectRoot, { recursive: true, force: true });
});

// ---------------------------------------------------------------------------
// readGeneratedFromHeader
// ---------------------------------------------------------------------------

describe("readGeneratedFromHeader", () => {
  it("extracts the feature path from the header comment", () => {
    expect(readGeneratedFromHeader(generatedSpecPath)).toBe("features/demo.feature");
  });

  it("returns undefined for files without the header", () => {
    const plainSpec = path.join(projectRoot, "plain.spec.js");
    fs.writeFileSync(plainSpec, 'import { test } from "@playwright/test";\n');
    expect(readGeneratedFromHeader(plainSpec)).toBeUndefined();
  });

  it("returns undefined for unreadable files", () => {
    expect(readGeneratedFromHeader(path.join(projectRoot, "missing.spec.js"))).toBeUndefined();
  });
});

// ---------------------------------------------------------------------------
// enrichBddTest
// ---------------------------------------------------------------------------

describe("enrichBddTest", () => {
  it("enriches a plain scenario with feature + scenario metadata", () => {
    const test = makeTestCase({ title: "First scenario" });
    const enrichment = enrichBddTest(test, projectRoot)!;
    expect(enrichment.featureName).toBe("Demo Feature");
    expect(enrichment.featureDescription).toBe("As a tester\nI want enriched reports");
    expect(enrichment.featureFilePath).toBe("features/demo.feature");
    expect(enrichment.scenarioName).toBe("First scenario");
    expect(enrichment.scenarioDescription).toBe("Happy-path description.");
    expect(enrichment.ruleName).toBeUndefined();
    expect(enrichment.tags).toEqual(expect.arrayContaining(["@smoke", "@DEMO-1", "@positive"]));
  });

  it("matches 'Example #N' outline tests and resolves the examples row", () => {
    const test = makeTestCase({
      title: "Example #2",
      parentTitle: "Outline scenario",
      grandparentTitle: "Business rule",
    });
    const enrichment = enrichBddTest(test, projectRoot)!;
    expect(enrichment.scenarioName).toBe("Outline scenario");
    expect(enrichment.ruleName).toBe("Business rule");
    expect(enrichment.exampleRow).toEqual({ input: "b" });
    expect(enrichment.tags).toEqual(expect.arrayContaining(["@outline"]));
  });

  it("matches custom-titled outline tests via the enclosing describe", () => {
    const test = makeTestCase({
      title: 'do something with "a"',
      parentTitle: "Outline scenario",
    });
    const enrichment = enrichBddTest(test, projectRoot)!;
    expect(enrichment.scenarioName).toBe("Outline scenario");
    expect(enrichment.exampleRow).toBeUndefined();
  });

  it("still returns feature metadata when no scenario matches", () => {
    const test = makeTestCase({ title: "Unknown scenario name" });
    const enrichment = enrichBddTest(test, projectRoot)!;
    expect(enrichment.featureName).toBe("Demo Feature");
    expect(enrichment.scenarioName).toBeUndefined();
    expect(enrichment.tags).toEqual(expect.arrayContaining(["@smoke", "@DEMO-1"]));
  });

  it("returns undefined for non-generated spec files", () => {
    const plainSpec = path.join(projectRoot, "plain.spec.js");
    fs.writeFileSync(plainSpec, 'import { test } from "@playwright/test";\n');
    const test = makeTestCase({ title: "First scenario", filePath: plainSpec });
    expect(enrichBddTest(test, projectRoot)).toBeUndefined();
  });

  it("resolves the feature file by walking up from the generated spec when projectRoot is wrong", () => {
    const test = makeTestCase({ title: "First scenario" });
    const enrichment = enrichBddTest(test, "/some/unrelated/root")!;
    expect(enrichment.featureName).toBe("Demo Feature");
  });
});
