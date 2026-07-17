# playwright-bdd Demo

A minimal, complete example of [playwright-bdd](https://vitalets.github.io/playwright-bdd/) (v9)
with `playwright-spec-doc-reporter` — including the reporter's **feature-file enrichment**.

`.feature` files are compiled into Playwright tests by `bddgen`. The glossy reporter detects the
generated tests, follows each spec's `// Generated from: <path>` header back to the source
`.feature` file, and enriches the report with everything the generated spec doesn't carry:

| Enrichment | Source |
|---|---|
| Feature narrative (As a… / I want… / So that…) | `Feature:` description block |
| Scenario description | free-form text under `Scenario:` |
| `Rule:` block name | rule enclosing the scenario |
| Examples row values (`Example #N` titles) | `Examples:` table |
| Gherkin tags (feature + scenario level) | `@tags` in the feature file |
| Source feature file path | `// Generated from:` header |
| Background steps in the step timeline | playwright-bdd's `beforeEach` hook |

## Run it

```bash
npm install
npx playwright install chromium
npm test          # bddgen + playwright test
npm run report    # open glossy-report/index.html
```

## Project structure

```
features/
  playwright-site.feature   # UI: Background, scenarios, Rule + Scenario Outline
  posts-api.feature         # API: inline request/response via fixtures
steps/
  fixtures.ts               # custom fixtures (apiRequest/apiResponse) + createBdd
  playwright-site.steps.ts
  posts-api.steps.ts
playwright.config.ts        # defineBddConfig + glossy reporter
reporter.mjs                # ESM shim for the reporter
```

## What to look at in the report

- **BDD tab** — features grouped with their narratives; scenarios show the description
  text from the `.feature` file, not just the test title.
- **Tests tab** — Gherkin steps color-coded by keyword (Given/When/Then), including the
  Background step; scenario-level and feature-level tags as filter pills.
- **API viewer** — the posts-api scenarios attach request/response JSON inline via the
  `apiRequest` / `apiResponse` fixtures (see `steps/fixtures.ts`).
- **Jira-style tags** — `@SCRUM-1`, `@DEMO-42` etc. flow through from the feature file;
  with `jira.enabled` they would post comments to those issues.

## Optional: AI failure analysis

```bash
ANTHROPIC_API_KEY=sk-ant-... npm test
```

When the key is present, failed tests get automatic root-cause analysis in the report.
