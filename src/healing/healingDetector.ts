import type { TestResult } from "@playwright/test/reporter";
import type { HealingDiff } from "./diffParser.js";

export type HealingOutcome = "auto-healed" | "skipped-app-broken" | "none";

export interface HealingEvent {
  outcome: HealingOutcome;
  /** Healer-provided skip reason when outcome = skipped-app-broken */
  reason?: string;
  testFilePath: string;
  diff?: HealingDiff;
}

/**
 * Inspect a TestResult for evidence of Healer agent activity.
 *
 * Rules:
 *  - auto-healed:        result.status === "passed"  AND (healer annotation OR file in diff index)
 *  - skipped-app-broken: result.status === "skipped" AND healer annotation present
 *
 * Returns null when no healing evidence is found.
 */
export function detectHealingEvent(
  testFilePath: string,
  result: TestResult,
  diffIndex?: Map<string, HealingDiff>
): HealingEvent | null {
  const healerAnnotation = result.annotations.find(a => a.type === "healer");
  const hasHealerAnnotation = Boolean(healerAnnotation);
  const isInDiff = diffIndex ? diffIndex.has(testFilePath) : false;

  let outcome: HealingOutcome = "none";

  if (result.status === "passed" && (hasHealerAnnotation || isInDiff)) {
    outcome = "auto-healed";
  } else if (result.status === "skipped" && hasHealerAnnotation) {
    outcome = "skipped-app-broken";
  }

  if (outcome === "none") return null;

  return {
    outcome,
    reason: healerAnnotation?.description,
    testFilePath,
    diff: diffIndex?.get(testFilePath),
  };
}

/** Attach diff data to an existing event (used when diff is resolved after detection). */
export function attachDiff(event: HealingEvent, diff: HealingDiff): HealingEvent {
  return { ...event, diff };
}
