/**
 * Cucumber configuration (JavaScript ES module).
 *
 * Runs .feature files using @cucumber/cucumber + Playwright for browser automation.
 * Produces cucumber-report.json which is ingested by the glossy reporter.
 *
 * Usage:
 *   npm run test:cucumber      — run Cucumber scenarios
 *   npm run report:standalone  — generate glossy HTML from cucumber-report.json only
 *
 * For the full playwright test runner mode, see playwright.config.js.
 */

/** @type {import('@cucumber/cucumber').IConfiguration} */
export default {
  default: {
    paths: ["features/**/*.feature"],
    require: ["support/**/*.js", "steps/**/*.js"],
    format: [
      "progress-bar",
      "json:cucumber-report.json",
      "html:cucumber-report.html",
    ],
    formatOptions: {
      snippetInterface: "async-await",
    },
    parallel: 2,
  },
};
