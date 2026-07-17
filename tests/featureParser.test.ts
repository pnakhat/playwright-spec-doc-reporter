import { describe, expect, it, afterEach } from "vitest";
import * as fs from "node:fs";
import * as os from "node:os";
import * as path from "node:path";
import { parseFeature, parseFeatureFileSync, clearFeatureCache } from "../src/cucumber/featureParser.js";

const FULL_FEATURE = `
@smoke @DEMO-1
Feature: Demo Feature
  As a tester
  I want to verify playwright-bdd output
  So that the reporter can enrich it

  Background:
    Given a background step

  @positive @DEMO-2
  Scenario: First scenario
    This scenario has a description line.

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

describe("parseFeature — structure", () => {
  it("parses feature name, tags, and narrative description", () => {
    const feature = parseFeature(FULL_FEATURE)!;
    expect(feature.name).toBe("Demo Feature");
    expect(feature.tags).toEqual(["@smoke", "@DEMO-1"]);
    expect(feature.description).toBe(
      "As a tester\nI want to verify playwright-bdd output\nSo that the reporter can enrich it"
    );
  });

  it("parses background steps", () => {
    const feature = parseFeature(FULL_FEATURE)!;
    expect(feature.background?.steps).toEqual([
      { keyword: "Given", text: "a background step" },
    ]);
  });

  it("parses scenario with tags, description, and steps", () => {
    const feature = parseFeature(FULL_FEATURE)!;
    const scenario = feature.scenarios.find(s => s.name === "First scenario")!;
    expect(scenario.tags).toEqual(["@positive", "@DEMO-2"]);
    expect(scenario.description).toBe("This scenario has a description line.");
    expect(scenario.isOutline).toBe(false);
    expect(scenario.steps).toEqual([
      { keyword: "When", text: 'I do something with "value"' },
      { keyword: "Then", text: "it should work" },
    ]);
  });

  it("parses rules and links enclosed scenarios to the rule", () => {
    const feature = parseFeature(FULL_FEATURE)!;
    expect(feature.rules).toEqual([{ name: "Business rule" }]);
    const outline = feature.scenarios.find(s => s.name === "Outline scenario")!;
    expect(outline.ruleName).toBe("Business rule");
  });

  it("parses scenario outlines with examples tables", () => {
    const feature = parseFeature(FULL_FEATURE)!;
    const outline = feature.scenarios.find(s => s.name === "Outline scenario")!;
    expect(outline.isOutline).toBe(true);
    expect(outline.tags).toEqual(["@outline"]);
    expect(outline.examples).toHaveLength(1);
    expect(outline.examples[0].headers).toEqual(["input"]);
    expect(outline.examples[0].rows).toEqual([["a"], ["b"]]);
  });

  it("supports Example: as a Scenario synonym", () => {
    const feature = parseFeature("Feature: F\n\n  Example: Synonym scenario\n    Given a step\n")!;
    expect(feature.scenarios[0].name).toBe("Synonym scenario");
    expect(feature.scenarios[0].steps).toEqual([{ keyword: "Given", text: "a step" }]);
  });

  it("skips comments and docstrings", () => {
    const feature = parseFeature(`
Feature: F
  # a comment
  Scenario: S
    Given a step with docstring
      """
      Scenario: not a real scenario
      """
    Then done
`)!;
    expect(feature.scenarios).toHaveLength(1);
    expect(feature.scenarios[0].steps).toEqual([
      { keyword: "Given", text: "a step with docstring" },
      { keyword: "Then", text: "done" },
    ]);
  });

  it("returns undefined when content has no Feature header", () => {
    expect(parseFeature("Just some text\nGiven nothing")).toBeUndefined();
  });

  it("supports multiple Examples blocks on one outline", () => {
    const feature = parseFeature(`
Feature: F
  Scenario Outline: O
    When I use "<x>"

    Examples: first
      | x |
      | 1 |

    @extra
    Examples: second
      | x |
      | 2 |
      | 3 |
`)!;
    const outline = feature.scenarios[0];
    expect(outline.examples).toHaveLength(2);
    expect(outline.examples[0].name).toBe("first");
    expect(outline.examples[1].tags).toEqual(["@extra"]);
    expect(outline.examples[1].rows).toEqual([["2"], ["3"]]);
  });
});

describe("parseFeatureFileSync — caching", () => {
  let tmpDir: string | undefined;

  afterEach(() => {
    clearFeatureCache();
    if (tmpDir) fs.rmSync(tmpDir, { recursive: true, force: true });
    tmpDir = undefined;
  });

  it("reads and parses a feature file from disk", () => {
    tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), "glossy-feature-"));
    const featurePath = path.join(tmpDir, "demo.feature");
    fs.writeFileSync(featurePath, "Feature: Disk Feature\n  Scenario: S\n    Given a step\n");
    const feature = parseFeatureFileSync(featurePath)!;
    expect(feature.name).toBe("Disk Feature");
  });

  it("returns undefined (cached) for a missing file", () => {
    expect(parseFeatureFileSync("/nonexistent/path.feature")).toBeUndefined();
    expect(parseFeatureFileSync("/nonexistent/path.feature")).toBeUndefined();
  });
});
