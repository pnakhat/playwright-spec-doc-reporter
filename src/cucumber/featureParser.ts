/**
 * Zero-dependency Gherkin .feature file parser.
 *
 * Parses the subset of Gherkin needed to enrich playwright-bdd test results:
 * feature name/description/tags, Background, Rule blocks, Scenario /
 * Scenario Outline (with Examples tables), and step keywords.
 *
 * English keywords only — playwright-bdd projects using `# language:` headers
 * fall back gracefully (the file simply yields no scenario matches).
 */

import fs from "node:fs";

// ─── Types ───

export interface ParsedFeatureStep {
  /** "Given" | "When" | "Then" | "And" | "But" | "*" */
  keyword: string;
  text: string;
}

export interface ParsedExamples {
  name?: string;
  tags: string[];
  headers: string[];
  rows: string[][];
}

export interface ParsedScenario {
  name: string;
  description?: string;
  /** Tags declared directly on this scenario (feature tags not included). */
  tags: string[];
  steps: ParsedFeatureStep[];
  isOutline: boolean;
  examples: ParsedExamples[];
  /** Name of the enclosing Rule block, if any. */
  ruleName?: string;
}

export interface ParsedRule {
  name: string;
  description?: string;
}

export interface ParsedFeature {
  name: string;
  description?: string;
  tags: string[];
  background?: { name?: string; steps: ParsedFeatureStep[] };
  rules: ParsedRule[];
  scenarios: ParsedScenario[];
}

// ─── Keyword patterns ───

const FEATURE_RE = /^Feature:\s*(.*)$/;
const RULE_RE = /^Rule:\s*(.*)$/;
const BACKGROUND_RE = /^Background:\s*(.*)$/;
const SCENARIO_RE = /^(?:Scenario|Example):\s*(.*)$/;
const OUTLINE_RE = /^(?:Scenario Outline|Scenario Template):\s*(.*)$/;
const EXAMPLES_RE = /^(?:Examples|Scenarios):\s*(.*)$/;
const STEP_RE = /^(Given|When|Then|And|But|\*)\s+(.+)$/;
const TAG_LINE_RE = /^@\S/;
const TABLE_ROW_RE = /^\|(.*)\|$/;

// ─── Parser ───

type Section =
  | { kind: "feature" }
  | { kind: "rule"; rule: ParsedRule }
  | { kind: "background"; steps: ParsedFeatureStep[] }
  | { kind: "scenario"; scenario: ParsedScenario }
  | { kind: "examples"; examples: ParsedExamples };

function parseTags(line: string): string[] {
  return line.split(/\s+/).filter(t => t.startsWith("@"));
}

function parseTableCells(line: string): string[] {
  const inner = line.replace(/^\|/, "").replace(/\|$/, "");
  return inner.split("|").map(c => c.trim());
}

/**
 * Parse Gherkin source text into a structured feature.
 * Returns undefined when the content has no `Feature:` header.
 */
export function parseFeature(content: string): ParsedFeature | undefined {
  const lines = content.split(/\r?\n/);

  let feature: ParsedFeature | undefined;
  let section: Section = { kind: "feature" };
  let pendingTags: string[] = [];
  let currentRuleName: string | undefined;
  let descriptionLines: string[] = [];
  let inDocString: string | null = null; // holds the closing delimiter

  const flushDescription = (): string | undefined => {
    const text = descriptionLines.join("\n").trim();
    descriptionLines = [];
    return text || undefined;
  };

  const applyDescription = () => {
    const desc = flushDescription();
    if (!desc || !feature) return;
    if (section.kind === "feature") feature.description = desc;
    else if (section.kind === "rule") section.rule.description = desc;
    else if (section.kind === "scenario") section.scenario.description = desc;
  };

  for (const rawLine of lines) {
    const line = rawLine.trim();

    // Docstring blocks (""" or ```) are consumed but not captured
    if (inDocString) {
      if (line.startsWith(inDocString)) inDocString = null;
      continue;
    }
    if (line.startsWith('"""') || line.startsWith("```")) {
      inDocString = line.slice(0, 3);
      continue;
    }

    if (!line || line.startsWith("#")) continue;

    if (TAG_LINE_RE.test(line)) {
      applyDescription();
      pendingTags.push(...parseTags(line));
      continue;
    }

    const featureMatch = line.match(FEATURE_RE);
    if (featureMatch && !feature) {
      feature = {
        name: featureMatch[1].trim(),
        tags: pendingTags,
        rules: [],
        scenarios: []
      };
      pendingTags = [];
      section = { kind: "feature" };
      continue;
    }
    if (!feature) continue;

    const ruleMatch = line.match(RULE_RE);
    if (ruleMatch) {
      applyDescription();
      const rule: ParsedRule = { name: ruleMatch[1].trim() };
      feature.rules.push(rule);
      currentRuleName = rule.name;
      pendingTags = [];
      section = { kind: "rule", rule };
      continue;
    }

    const backgroundMatch = line.match(BACKGROUND_RE);
    if (backgroundMatch) {
      applyDescription();
      const steps: ParsedFeatureStep[] = [];
      feature.background = { name: backgroundMatch[1].trim() || undefined, steps };
      pendingTags = [];
      section = { kind: "background", steps };
      continue;
    }

    const outlineMatch = line.match(OUTLINE_RE);
    const scenarioMatch = outlineMatch ? null : line.match(SCENARIO_RE);
    if (outlineMatch || scenarioMatch) {
      applyDescription();
      const scenario: ParsedScenario = {
        name: (outlineMatch ?? scenarioMatch)![1].trim(),
        tags: pendingTags,
        steps: [],
        isOutline: !!outlineMatch,
        examples: [],
        ruleName: currentRuleName
      };
      feature.scenarios.push(scenario);
      pendingTags = [];
      section = { kind: "scenario", scenario };
      continue;
    }

    const examplesMatch = line.match(EXAMPLES_RE);
    if (examplesMatch) {
      applyDescription();
      const lastScenario = feature.scenarios[feature.scenarios.length - 1];
      const examples: ParsedExamples = {
        name: examplesMatch[1].trim() || undefined,
        tags: pendingTags,
        headers: [],
        rows: []
      };
      if (lastScenario) lastScenario.examples.push(examples);
      pendingTags = [];
      section = { kind: "examples", examples };
      continue;
    }

    const stepMatch = line.match(STEP_RE);
    if (stepMatch) {
      applyDescription();
      const step: ParsedFeatureStep = { keyword: stepMatch[1], text: stepMatch[2].trim() };
      if (section.kind === "background") section.steps.push(step);
      else if (section.kind === "scenario") section.scenario.steps.push(step);
      continue;
    }

    if (TABLE_ROW_RE.test(line)) {
      if (section.kind === "examples") {
        const cells = parseTableCells(line);
        if (section.examples.headers.length === 0) section.examples.headers = cells;
        else section.examples.rows.push(cells);
      }
      // Data tables attached to steps are skipped
      continue;
    }

    // Any other non-empty line is free-form description text
    descriptionLines.push(line);
  }

  applyDescription();
  return feature;
}

// ─── Cached file access ───

const featureCache = new Map<string, ParsedFeature | undefined>();

/**
 * Read and parse a .feature file, caching by absolute path.
 * Returns undefined if the file is missing or has no Feature header.
 */
export function parseFeatureFileSync(absolutePath: string): ParsedFeature | undefined {
  if (featureCache.has(absolutePath)) return featureCache.get(absolutePath);
  let parsed: ParsedFeature | undefined;
  try {
    const content = fs.readFileSync(absolutePath, "utf-8");
    parsed = parseFeature(content);
  } catch {
    parsed = undefined;
  }
  featureCache.set(absolutePath, parsed);
  return parsed;
}

/** Clear the parsed-feature cache (used by tests). */
export function clearFeatureCache(): void {
  featureCache.clear();
}
