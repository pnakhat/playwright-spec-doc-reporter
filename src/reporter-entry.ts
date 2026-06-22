// Default-export entry point for Playwright's reporter loader.
//
// Playwright instantiates a custom reporter from a module path and uses that
// module's *default* export as the Reporter constructor, e.g.:
//
//   reporter: [["playwright-spec-doc-reporter/reporter", { ai: { enabled: true } }]]
//
// The named export is also re-exported for direct programmatic use.
import { GlossyPlaywrightReporter } from "./reporter/glossyReporter.js";

export default GlossyPlaywrightReporter;
export { GlossyPlaywrightReporter };
