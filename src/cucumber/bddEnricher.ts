/**
 * playwright-bdd enrichment — first-class metadata for generated tests.
 *
 * playwright-bdd compiles .feature files into Playwright specs under
 * .features-gen/ and stamps each generated file with a header comment:
 *
 *   // Generated from: features/login.feature
 *
 * The generated spec carries no feature description, scenario description,
 * or feature file path. This module follows the header back to the source
 * .feature file, parses it, and matches the running test to its scenario —
 * recovering the full Gherkin context for the report.
 */

import fs from "node:fs";
import path from "node:path";
import type { TestCase } from "@playwright/test/reporter";
import {
  parseFeatureFileSync,
  type ParsedFeature,
  type ParsedScenario
} from "./featureParser.js";

// ─── Types ───

export interface BddEnrichment {
  featureName: string;
  featureDescription?: string;
  /** Feature file path as written in the generated spec header (project-relative). */
  featureFilePath: string;
  scenarioName?: string;
  scenarioDescription?: string;
  ruleName?: string;
  /** Feature-level + scenario-level tags from the .feature file. */
  tags: string[];
  /** For Scenario Outline "Example #N" tests: the resolved examples row. */
  exampleRow?: Record<string, string>;
}

// ─── Generated-file header resolution ───

const GENERATED_FROM_RE = /^\/\/\s*Generated from:\s*(.+?)\s*$/;
const HEADER_SCAN_LINES = 10;
const EXAMPLE_TITLE_RE = /^Example #(\d+)$/;

const generatedFromCache = new Map<string, string | undefined>();

/**
 * Extract the source .feature path from a playwright-bdd generated spec file.
 * Scans the first few lines for the "// Generated from:" header comment.
 */
export function readGeneratedFromHeader(generatedSpecPath: string): string | undefined {
  if (generatedFromCache.has(generatedSpecPath)) return generatedFromCache.get(generatedSpecPath);
  let featurePath: string | undefined;
  try {
    const content = fs.readFileSync(generatedSpecPath, "utf-8");
    const lines = content.split(/\r?\n/, HEADER_SCAN_LINES);
    for (const line of lines) {
      const match = line.match(GENERATED_FROM_RE);
      if (match) {
        featurePath = match[1];
        break;
      }
    }
  } catch {
    featurePath = undefined;
  }
  generatedFromCache.set(generatedSpecPath, featurePath);
  return featurePath;
}

/**
 * Resolve the feature path from the header against likely base directories.
 * playwright-bdd writes it relative to the directory containing playwright.config.
 */
function resolveFeaturePath(
  featureRelPath: string,
  generatedSpecPath: string,
  projectRoot: string
): string | undefined {
  const candidates = [
    path.resolve(projectRoot, featureRelPath),
    path.resolve(process.cwd(), featureRelPath)
  ];
  // Fallback: walk up from the generated spec looking for the feature file,
  // covering configs where .features-gen/ lives somewhere non-standard.
  let dir = path.dirname(generatedSpecPath);
  for (let i = 0; i < 6; i++) {
    candidates.push(path.resolve(dir, featureRelPath));
    const parent = path.dirname(dir);
    if (parent === dir) break;
    dir = parent;
  }
  for (const candidate of candidates) {
    if (fs.existsSync(candidate)) return candidate;
  }
  return undefined;
}

// ─── Scenario matching ───

function findScenario(
  feature: ParsedFeature,
  test: TestCase
): { scenario: ParsedScenario; exampleRow?: Record<string, string> } | undefined {
  const titlePath = test.titlePath();

  // Scenario Outline tests are titled "Example #N" inside a describe named
  // after the outline: match the parent suite title against outline names.
  const exampleMatch = test.title.match(EXAMPLE_TITLE_RE);
  if (exampleMatch) {
    const outlineName = test.parent?.title;
    const scenario = feature.scenarios.find(s => s.isOutline && s.name === outlineName);
    if (scenario) {
      const rowIndex = parseInt(exampleMatch[1], 10) - 1;
      return { scenario, exampleRow: resolveExampleRow(scenario, rowIndex) };
    }
  }

  // Direct title match; disambiguate duplicated names across Rule blocks
  // by requiring the rule name to appear in the title path.
  const byTitle = feature.scenarios.filter(s => s.name === test.title);
  if (byTitle.length === 1) return { scenario: byTitle[0] };
  if (byTitle.length > 1) {
    const withRule = byTitle.find(s => s.ruleName && titlePath.includes(s.ruleName));
    return { scenario: withRule ?? byTitle[0] };
  }

  // Custom examplesTitleFormat: title differs from "Example #N" but the
  // enclosing describe still carries the outline name.
  const outlineByParent = feature.scenarios.find(
    s => s.isOutline && s.name === test.parent?.title
  );
  if (outlineByParent) return { scenario: outlineByParent };

  return undefined;
}

function resolveExampleRow(
  scenario: ParsedScenario,
  rowIndex: number
): Record<string, string> | undefined {
  // "Example #N" numbers rows sequentially across all Examples blocks.
  let remaining = rowIndex;
  for (const examples of scenario.examples) {
    if (remaining < examples.rows.length) {
      const row = examples.rows[remaining];
      const record: Record<string, string> = {};
      examples.headers.forEach((header, i) => {
        record[header] = row[i] ?? "";
      });
      return record;
    }
    remaining -= examples.rows.length;
  }
  return undefined;
}

// ─── Public API ───

/**
 * Enrich a playwright-bdd generated test with metadata from its source
 * .feature file. Returns undefined when the test is not a playwright-bdd
 * generated test or the feature file cannot be located.
 */
export function enrichBddTest(test: TestCase, projectRoot: string): BddEnrichment | undefined {
  const specPath = test.location?.file;
  if (!specPath) return undefined;

  const featureRelPath = readGeneratedFromHeader(specPath);
  if (!featureRelPath) return undefined;

  const featureAbsPath = resolveFeaturePath(featureRelPath, specPath, projectRoot);
  if (!featureAbsPath) return undefined;

  const feature = parseFeatureFileSync(featureAbsPath);
  if (!feature) return undefined;

  const matched = findScenario(feature, test);
  const tagSet = new Set<string>(feature.tags);
  if (matched) {
    for (const tag of matched.scenario.tags) tagSet.add(tag);
  }

  return {
    featureName: feature.name,
    featureDescription: feature.description,
    featureFilePath: featureRelPath.split(path.sep).join("/"),
    scenarioName: matched?.scenario.name,
    scenarioDescription: matched?.scenario.description,
    ruleName: matched?.scenario.ruleName,
    tags: [...tagSet],
    exampleRow: matched?.exampleRow
  };
}

/** Clear the generated-file header cache (used by tests). */
export function clearBddEnricherCache(): void {
  generatedFromCache.clear();
}
