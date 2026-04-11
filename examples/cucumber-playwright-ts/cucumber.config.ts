/**
 * Cucumber configuration for running .feature files with Playwright.
 *
 * This example uses @cucumber/cucumber with Playwright directly (no playwright-bdd).
 * Scenarios run via Cucumber CLI and produce a JSON report that the glossy reporter ingests.
 *
 * Usage:
 *   npm run test:cucumber        — runs Cucumber, generates JSON report
 *   npm run test:playwright      — runs playwright-bdd tests (reads same .feature files)
 *   npm run report               — generates the glossy HTML report from cucumber-report.json
 */
export default {
  default: {
    paths: ["features/**/*.feature"],
    require: ["support/**/*.ts", "steps/**/*.ts"],
    requireModule: ["ts-node/esm"],
    format: [
      "progress-bar",
      `json:cucumber-report.json`,
      `html:cucumber-report.html`,
    ],
    formatOptions: {
      snippetInterface: "async-await",
    },
    worldParameters: {
      baseUrl: process.env.BASE_URL ?? "https://www.saucedemo.com",
    },
    parallel: 2,
  },
};
