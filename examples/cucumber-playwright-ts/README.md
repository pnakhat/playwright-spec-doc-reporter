# Cucumber + Playwright — TypeScript Example

This example demonstrates using `playwright-spec-doc-reporter` with **Cucumber BDD** and **Playwright** in TypeScript.

## Two integration modes

### Mode 1: playwright-bdd (recommended)

[playwright-bdd](https://vitalets.github.io/playwright-bdd/) converts `.feature` files into Playwright tests at build time. The glossy reporter receives standard Playwright test events and auto-detects BDD metadata (feature, scenario, tags, Gherkin steps).

```bash
npm install
npx playwright install --with-deps chromium
npm test                     # bddgen + playwright test
npm run report               # open glossy-report/index.html
```

### Mode 2: @cucumber/cucumber + JSON ingestion

Run Cucumber independently (with Playwright for browser automation in hooks) and ingest the resulting JSON report into the glossy reporter.

```bash
npm run test:cucumber        # cucumber-js → cucumber-report.json
```

Then set `cucumber.jsonReports: "cucumber-report.json"` in `playwright.config.ts` and run a Playwright suite to generate the combined glossy report.

## Project structure

```
features/
  login.feature              # Gherkin scenarios
  cart.feature
steps/
  login.steps.ts             # Step definitions (TypeScript)
  cart.steps.ts
support/
  world.ts                   # Custom World with Playwright page
  hooks.ts                   # Before/After hooks (browser lifecycle)
playwright.config.ts         # playwright-bdd + glossy reporter config
cucumber.config.ts           # @cucumber/cucumber CLI config
```

## Reporter config

```ts
// playwright.config.ts
cucumber: {
  enhancePlaywrightBdd: true,   // auto-detect playwright-bdd tests
  autoTags: ["@cucumber"],      // add @cucumber tag to all BDD tests

  // Optional: also ingest a Cucumber JSON report
  // jsonReports: "cucumber-report.json",
}
```

## Environment variables

| Variable              | Description                          |
|-----------------------|--------------------------------------|
| `BASE_URL`            | Override the target app URL          |
| `ANTHROPIC_API_KEY`   | Enable AI failure analysis           |
| `RECORD_VIDEO`        | Record videos in Cucumber mode       |
