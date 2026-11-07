# Cucumber & playwright-bdd

Enrich playwright-bdd tests with Gherkin metadata, or merge `@cucumber/cucumber` JSON reports.

The reporter supports two ways to combine **Cucumber BDD** and **Playwright**:

| Mode | How it works | Best for |
|------|-------------|----------|
| **playwright-bdd** | `playwright-bdd` converts `.feature` files into Playwright tests at build time. The reporter auto-detects them and enriches with Feature/Scenario/Gherkin metadata. | New projects, full Playwright tooling |
| **Cucumber JSON ingestion** | Run `@cucumber/cucumber` independently → JSON report → reporter merges scenarios alongside any Playwright tests. | Teams already using Cucumber CLI |

## Mode 1 — playwright-bdd (TypeScript or JavaScript)

Install [`playwright-bdd`](https://vitalets.github.io/playwright-bdd/):

```bash
npm install -D playwright-bdd @cucumber/cucumber
```

Point `defineBddConfig` at your `.feature` files and step definitions, then add `cucumber.enhancePlaywrightBdd: true` to the reporter config:

```ts
// playwright.config.ts
import { defineConfig } from "@playwright/test";
import { defineBddConfig } from "playwright-bdd";

const testDir = defineBddConfig({
  features: "features/**/*.feature",
  steps: ["steps/**/*.ts", "support/fixtures.ts"],
});

export default defineConfig({
  testDir,
  reporter: [
    ["playwright-spec-doc-reporter/reporter", {
      outputDir: "glossy-report",
      cucumber: {
        enhancePlaywrightBdd: true,   // auto-detect playwright-bdd tests
        autoTags: ["@cucumber"],      // tag applied to every BDD result
      },
    }],
  ],
});
```

Generate the tests then run normally:

```bash
npx bddgen          # generates .features-gen/ from .feature files
npx playwright test # runs tests + produces glossy report
```

**Feature-file enrichment** — the generated specs don't carry the feature narrative,
scenario descriptions, or `Rule:` context. The reporter recovers them automatically:
it follows each generated spec's `// Generated from: <path>` header back to the source
`.feature` file, parses it (zero dependencies), and enriches every test result with:

| Enrichment | Where it appears |
|---|---|
| Feature narrative (As a… / I want… / So that…) | BDD tab + Docs export |
| Scenario description (free-form text under `Scenario:`) | test detail view |
| `Rule:` block name | `ruleName` in `results.json` |
| Examples row values for `Scenario Outline` (`Example #N` titles) | appended to the scenario description |
| Feature + scenario `@tags` | filter pills, Jira integration |
| Source `.feature` file path | `featureFilePath` in `results.json` |
| Background steps (run in a `beforeEach` hook) | step timeline, keyword-colored |

No configuration needed — enrichment activates whenever `enhancePlaywrightBdd` is on
(the default) and the `.feature` file referenced by the header exists on disk.

See [`examples/playwright-bdd-demo`](examples/playwright-bdd-demo) for a complete runnable project.

**Inline API traffic in playwright-bdd steps** — add `apiRequest` / `apiResponse` fixtures to your custom fixture file:

```ts
// support/fixtures.ts
import { test as base, createBdd } from "playwright-bdd";
import type { TestInfo } from "@playwright/test";

export const test = base.extend({
  apiRequest: async ({}, use, testInfo: TestInfo) => {
    await use((method, url, body?, headers?) => {
      testInfo.annotations.push({
        type: "glossy:request",
        description: JSON.stringify({ kind: "request", method: method.toUpperCase(), url, body, headers }),
      });
    });
  },
  apiResponse: async ({}, use, testInfo: TestInfo) => {
    await use((status, body?, headers?) => {
      testInfo.annotations.push({
        type: "glossy:response",
        description: JSON.stringify({ kind: "response", status, body, headers }),
      });
    });
  },
});

export const { Given, When, Then } = createBdd(test);
```

Then use them in step definitions:

```ts
// steps/api.steps.ts
import { Given, When, Then } from "../support/fixtures.js";

When("I send a GET request to {string}", async ({ apiRequest, apiResponse }, url: string) => {
  apiRequest("GET", url);
  const res = await fetch(url);
  const body = await res.json();
  apiResponse(res.status, body);
});
```

---

## Mode 2 — @cucumber/cucumber JSON ingestion

Run Cucumber independently and point the reporter at the output JSON file:

```bash
# 1. Run Cucumber — produces cucumber-report.json
npx cucumber-js --format json:cucumber-report.json

# 2. Run Playwright tests (reporter reads cucumber-report.json on onEnd)
npx playwright test
```

```ts
// playwright.config.ts
reporter: [["playwright-spec-doc-reporter/reporter", {
  outputDir: "glossy-report",
  cucumber: {
    jsonReports: "cucumber-report.json",   // or an array of paths
    enhancePlaywrightBdd: true,            // also enrich playwright-bdd tests
    autoTags: ["@cucumber"],
  },
}]],
```

**Inline API traffic in @cucumber/cucumber steps** — import the dedicated helper (no `test.info()` needed):

```js
// steps/api.steps.js
import { attachApiRequest, attachApiResponse }
  from "playwright-spec-doc-reporter/cucumber-annotations";

When("I call the API", async function() {
  const url = `${this.baseUrl}/posts`;
  attachApiRequest(this, "GET", url);
  const res = await fetch(url);
  const body = await res.json();
  attachApiResponse(this, res.status, body);
  this.lastResponse = { status: res.status, body };
});
```

The embeddings are encoded in the Cucumber JSON report and decoded by the adapter when generating the glossy report.

---

## Jira integration with Cucumber

Jira integration works **automatically** for both Cucumber modes — no extra configuration needed beyond what you already set in `jiraConfig`.

**How it works:** The Jira integration groups test results by tags matching the pattern `@PROJ-123` (e.g. `@SCRUM-1`, `@ABC-42`). Since the Cucumber adapter preserves all Gherkin tags (feature-level and scenario-level) in `NormalizedTestResult.tags`, any `@JIRAKEY-N` tag placed on a `Feature:` or `Scenario:` block is automatically picked up.

### playwright-bdd — tag your .feature files

```gherkin
@smoke @auth @SCRUM-1
Feature: User Authentication

  @positive @SCRUM-2
  Scenario: Successful login with valid credentials
    Given I am on the login page
    When I enter username "standard_user" and password "secret_sauce"
    Then I should see the products page

  @negative @SCRUM-3
  Scenario: Login fails with invalid credentials
    Given I am on the login page
    When I enter invalid credentials
    Then I should see an error message
```

The scenario tagged `@SCRUM-2` inherits `@SCRUM-1` from the feature **and** its own `@SCRUM-2`. After the run, both `SCRUM-1` and `SCRUM-2` receive Jira comments for that scenario.

### @cucumber/cucumber — same Gherkin tags, same result

```gherkin
@api @DEMO-10
Feature: JSONPlaceholder REST API

  @create @DEMO-11
  Scenario: Create a new post
    When I send a POST request to "/posts" with body:
      ...
    Then the response status should be 201
```

Run Cucumber → produce JSON → run Playwright with `cucumber.jsonReports` pointing at the JSON → Jira comments are posted for `DEMO-10` and `DEMO-11`.

### Full config example

```ts
// playwright.config.ts
reporter: [["playwright-spec-doc-reporter/reporter", {
  outputDir: "glossy-report",
  cucumber: {
    jsonReports: "cucumber-report.json",
    enhancePlaywrightBdd: true,
  },
  jira: {
    enabled: true,
    baseUrl: "https://your-org.atlassian.net",
    email: process.env.JIRA_EMAIL,
    apiToken: process.env.JIRA_API_TOKEN,
    commentOnPass: true,
    commentOnFail: true,
    includeApiTraffic: true,
  },
}]],
```

> **Tip:** Tags on a `Feature:` line apply to **every** scenario in that feature. Use scenario-level tags (`@PROJ-N` on the `Scenario:` line) to link individual scenarios to specific Jira tickets.

---

## CucumberConfig reference

```ts
cucumber?: {
  /**
   * Path(s) to @cucumber/cucumber JSON report files.
   * Example: "cucumber-report.json" or ["reports/a.json", "reports/b.json"]
   */
  jsonReports?: string | string[];

  /**
   * Auto-detect and enrich playwright-bdd generated tests (default: true).
   * Detects tests in .features-gen/, *.feature.spec.* files, and BDD annotations.
   */
  enhancePlaywrightBdd?: boolean;

  /**
   * Tags applied to every Cucumber-sourced result (default: ["@cucumber"]).
   */
  autoTags?: string[];
}
```

## Example projects

| Project | Language | Integration |
|---------|----------|-------------|
| [`examples/cucumber-playwright-ts`](examples/cucumber-playwright-ts/) | TypeScript | playwright-bdd, UI + API scenarios |
| [`examples/cucumber-playwright-js`](examples/cucumber-playwright-js/) | JavaScript | @cucumber/cucumber JSON ingestion + Playwright |
| [`examples/npm-package-demo`](examples/npm-package-demo/) | TypeScript | Consumes the **published npm** package (`^1.0.0`), not a local path |
