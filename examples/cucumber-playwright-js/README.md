# Cucumber + Playwright — JavaScript Example

This example demonstrates using `playwright-spec-doc-reporter` with **Cucumber BDD** and **Playwright** in plain JavaScript (ESM).

## Workflow

```
features/*.feature   ─── @cucumber/cucumber ──► cucumber-report.json
                                                        │
tests/*.spec.js      ─── playwright test ──────────────┤
                                                        ▼
                                          glossy-report/index.html
```

1. Cucumber CLI runs `.feature` files and produces `cucumber-report.json`
2. Playwright test runner executes `tests/*.spec.js`
3. The glossy reporter ingests both — Cucumber JSON + Playwright results — into one unified HTML report

## Quick start

```bash
npm install
npx playwright install --with-deps chromium

# Step 1: run Cucumber scenarios (produces cucumber-report.json)
npm run test:cucumber

# Step 2: run Playwright tests + generate glossy report
#         (reads cucumber-report.json automatically)
npm run test:playwright

# Open the report
npm run report
```

Or run everything at once:
```bash
npm test
```

## Project structure

```
features/
  todo.feature          # TodoMVC Gherkin scenarios
  api.feature           # JSONPlaceholder API scenarios
steps/
  todo.steps.js         # Step definitions
  api.steps.js
support/
  world.js              # Custom World (Playwright browser/page)
  hooks.js              # Before/After hooks
tests/
  smoke.spec.js         # Regular Playwright tests (merged into same report)
playwright.config.js    # Reporter config with cucumber.jsonReports
cucumber.config.js      # @cucumber/cucumber CLI config
```

## Reporter config

```js
// playwright.config.js
cucumber: {
  jsonReports: "cucumber-report.json",   // ingest Cucumber output
  enhancePlaywrightBdd: true,            // also detect playwright-bdd tests
  autoTags: ["@cucumber"],               // tag all Cucumber results
}
```

## Environment variables

| Variable              | Description                        |
|-----------------------|------------------------------------|
| `ANTHROPIC_API_KEY`   | Enable AI failure analysis         |
