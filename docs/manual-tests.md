# Manual test results

Merge manually executed tests into the same report.

Merge manually-authored test results into the same HTML report alongside your automated Playwright tests. Manual tests support both plain prose and Gherkin (Given/When/Then) formats, can carry Jira issue tags, and appear with a purple **✎ Manual** badge and a dedicated `@manual` tag filter.

## Setup

Point the reporter at your manual results file:

```js
// playwright.config.js
["playwright-spec-doc-reporter", {
  outputDir: "spec-doc-report",
  manualTests: {
    resultsPath: "tests/manual-results.md",
  },
}]
```

## File format

Create a Markdown file. `#` headings group tests into Features; `##` headings define individual tests. Tags in the heading line control status and carry through to Jira.

```markdown
# Feature: Checkout Flow

## User can complete checkout with valid card @PASS @SCRUM-10 @smoke
Notes: Tested on Chrome 120, prod environment

## Guest checkout fails with expired card @FAIL @SCRUM-11
Notes: Reproduced 3/3 times
Error: Payment gateway timeout after 30s
```

### Gherkin style (Given/When/Then)

Any block containing `Given`, `When`, `Then`, `And`, or `But` lines is parsed as Gherkin. Steps are rendered in the test detail view exactly like automated test steps.

```markdown
# Feature: Login

## Scenario: Standard user can login @PASS @SCRUM-1 @smoke
Given I am on the login page
When I enter valid credentials
Then I should be redirected to the dashboard
And I should see my username in the header

## Scenario: Login with expired password @FAIL @SCRUM-2
Given I am on the login page
When I enter credentials for an expired account
Then I should see a password expiry warning
Error: Warning message not displayed — bug confirmed
Notes: Tested on Chrome and Firefox
```

Both formats can coexist in the same file.

## Status tags

| Tag | Result status |
|---|---|
| `@PASS` | passed |
| `@FAIL` | failed |
| `@SKIP` | skipped |
| _(none)_ | passed (default) |

Status tags are stripped from the displayed title. All other tags (e.g. `@smoke`, `@SCRUM-1`) are preserved and appear as filter pills.

## Behaviour in the report

- Manual tests appear in the Tests tab with a purple **✎ Manual** badge
- `@manual` is auto-added to every parsed test — click it in the tag filter bar to isolate manual results
- Failed manual tests count in the overall pass rate and failure banner
- Gherkin steps render in the test detail step timeline
- `Error:` lines appear as the failure message; for Gherkin tests the last step is marked failed
- `Notes:` lines appear as the scenario description

## Jira integration

Manual tests participate in the existing Jira integration without any extra config. A manual test tagged `@SCRUM-1` will post a Jira comment in the same way as an automated test — including BDD docs, steps (Gherkin or notes), and the error message if failed.
