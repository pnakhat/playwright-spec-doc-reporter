/**
 * Local reporter shim for the js-es6-demo example.
 *
 * In a real project you would install playwright-spec-doc-reporter from npm:
 *   npm install -D playwright-spec-doc-reporter
 *
 * And then reference it directly in playwright.config.js:
 *   reporter: [["playwright-spec-doc-reporter", { ... }]]
 *
 * Here we reference the built dist from the repo root so the example works
 * without a published package.
 */
export { GlossyPlaywrightReporter as default } from "../../dist/index.js";
