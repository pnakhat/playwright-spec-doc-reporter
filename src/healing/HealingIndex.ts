import type { HealingEvent } from "./healingDetector.js";
import type { HealingSummaryData } from "../types/index.js";

export interface HealingIndexJSON {
  summary: HealingSummaryData;
  events: HealingEvent[];
}

export class HealingIndex {
  private readonly _events: HealingEvent[] = [];

  add(event: HealingEvent): void {
    this._events.push(event);
  }

  getSummary(): HealingSummaryData {
    const autoHealed = this._events.filter(e => e.outcome === "auto-healed").length;
    const skippedAppBroken = this._events.filter(e => e.outcome === "skipped-app-broken").length;

    let flakinessSignal: "low" | "medium" | "high";
    if (autoHealed === 0 && skippedAppBroken === 0) {
      flakinessSignal = "low";
    } else if (skippedAppBroken > 0 || autoHealed >= 4) {
      flakinessSignal = "high";
    } else {
      flakinessSignal = "medium";
    }

    return {
      totalAutoHealed: autoHealed,
      totalSkippedAppBroken: skippedAppBroken,
      flakinessSignal,
      events: this._events.map(e => ({
        outcome: e.outcome as "auto-healed" | "skipped-app-broken",
        reason: e.reason,
        patchSummary: e.diff?.patchSummary,
        locatorsBefore: e.diff?.locatorsBefore,
        locatorsAfter: e.diff?.locatorsAfter,
      })),
    };
  }

  toJSON(): HealingIndexJSON {
    return {
      summary: this.getSummary(),
      events: [...this._events],
    };
  }

  get isEmpty(): boolean {
    return this._events.length === 0;
  }
}
