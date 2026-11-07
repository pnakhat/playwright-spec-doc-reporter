# Jira

Post results as Jira comments and raise bugs for failures automatically.

## Jira Test Results Integration

After each Playwright run, the reporter automatically posts a comment to any Jira issue that a test is tagged with. Tag a test with `@PROJECT-123` (e.g. `@SCRUM-1`) and a formatted comment is posted to that issue containing the test result, steps, BDD documentation, API traffic, and screenshots.

### Setup

Store credentials in environment variables — never hard-code them:

```bash
JIRA_EMAIL=you@yourorg.com
JIRA_API_TOKEN=<your-api-token>   # https://id.atlassian.com/manage-profile/security/api-tokens
```

Enable in `playwright.config.ts`:

```ts
jira: {
  enabled: !!process.env.JIRA_API_TOKEN,
  baseUrl: "https://yourorg.atlassian.net",
  email: process.env.JIRA_EMAIL,
  apiToken: process.env.JIRA_API_TOKEN,

  // What to include in the comment:
  includeScreenshots: true,   // upload & embed Playwright screenshots inline
  includeApiTraffic: true,    // include glossy:request/response API logs

  // Only comment when a test flips pass↔fail (recommended for CI):
  commentOnStatusChange: true,  // default: false

  // OR: time-based cooldown (blunter — may suppress a new failure within the window):
  // commentCooldownMs: 3_600_000,

  // Control which statuses trigger a comment:
  commentOnPass: true,    // default: true
  commentOnFail: true,    // default: true
  commentOnSkip: false,   // default: false
}
```

### Tagging tests

Add the Jira issue key as a tag — the pattern `@PROJECT-123` is automatically detected:

```ts
test("user can checkout @SCRUM-1 @smoke", async ({ page }) => { ... });

// or via test.tag() (Playwright 1.42+):
test("user can checkout", { tag: ["@SCRUM-1", "@smoke"] }, async ({ page }) => { ... });
```

A test can reference multiple issues — each gets its own comment.

### What appears in the comment

| Section | When shown |
|---|---|
| Status, duration, file path | Always |
| 🏷 Feature / 📖 Scenario / ✦ Behaviours | When BDD annotations are present |
| Steps | Always (up to 10) |
| Error + stack snippet | Failed / timed-out tests |
| API Traffic | When `includeApiTraffic: true` and `glossy:request/response` annotations exist |
| 📸 Screenshots | When `includeScreenshots: true` and Playwright captured screenshots |

### Controlling comment frequency

**Recommended: `commentOnStatusChange`**

Set `commentOnStatusChange: true` to only post a comment when a test's result flips since the previous run (pass→fail or fail→pass). Tests that stay at the same status across runs are silently skipped.

```ts
jira: {
  enabled: true,
  commentOnStatusChange: true,  // comment only when pass↔fail flips
}
```

This reads `spec-doc-history.json` (already maintained by the reporter for trend charts). On the first run there is no history, so all tagged tests comment as normal.

**Alternative: `commentCooldownMs`**

A time-based fallback — skips if a comment was posted on the same issue within the configured window. Less precise than `commentOnStatusChange` because it may suppress a genuine new failure that occurs within the cooldown period.

```ts
jira: {
  enabled: true,
  commentCooldownMs: 3_600_000,  // 1 hour
}
```

### Environment variable reference

| Variable | Purpose |
|---|---|
| `JIRA_EMAIL` | Jira account email (Basic auth) |
| `JIRA_API_TOKEN` | Jira API token |
| `JIRA_BASE_URL` | Optional — overrides `baseUrl` in config |


## Jira Auto-Bug Creation

> Complements the [Jira Test Results Integration](#jira-test-results-integration) — that feature comments on **user stories** you explicitly tag. This feature creates **Bug tickets** automatically for every failed test, with no tagging required.

### How it works

After each run the reporter:

1. Finds all failed / timed-out tests
2. Optionally checks for an existing open bug with the same test name (deduplication)
3. Creates a `Bug` issue with a full ADF description containing:
   - Test name, file, duration, browser, retries
   - Error message + stack trace
   - AI analysis (root cause, confidence, remediation, suggested patch)
   - BDD steps (Given/When/Then behaviours)
   - API request/response traffic
4. Uploads Playwright **screenshots** and **video recordings** as attachments

### Setup

```bash
# .env (gitignored)
JIRA_BASE_URL=https://yourorg.atlassian.net
JIRA_EMAIL=you@example.com
JIRA_API_TOKEN=ATATT3x...      # https://id.atlassian.com/manage-profile/security/api-tokens
JIRA_PROJECT_KEY=QA            # project where bugs will be created
```

```ts
// playwright.config.ts
jira: {
  enabled: !!process.env.JIRA_API_TOKEN,
  baseUrl: process.env.JIRA_BASE_URL ?? "https://yourorg.atlassian.net",
  email: process.env.JIRA_EMAIL,
  apiToken: process.env.JIRA_API_TOKEN,

  autoBugs: {
    enabled: !!process.env.JIRA_API_TOKEN,
    projectKey: process.env.JIRA_PROJECT_KEY ?? "QA",
    issueType: "Bug",
    defaultPriority: "Medium",
    labels: ["auto-generated", "playwright"],
    onlyForAIAnalyzed: false,           // create bugs for ALL failed tests
    deduplicateByTestName: true,        // skip if open bug already exists
    includeScreenshots: true,           // attach screenshots
    includeVideos: true,                // attach video recordings (.webm)
    includeApiTraffic: true,            // embed API logs in description
  },
}
```

### What the Jira bug looks like

```
Summary: [Playwright] intentional failure for AI analysis demo @regression

Description:
─────────────────────────────────────────────────────
🐛 Failing Test
  Test:     AI Failure Analysis › intentional failure for AI analysis demo
  File:     tests/ui/saucedemo.spec.js
  Status:   failed
  Duration: 7.1s
  Browser:  chromium

❌ Error
  Error: expect(locator).toBeVisible() failed
  Locator: getByRole('heading', { name: 'Non Existing Header' })
  Expected: visible — element(s) not found

🤖 AI Analysis
  Summary:   The assertion checks for a heading that does not exist.
  Root cause: Sentinel heading name used for demo — element absent by design.
  Category:  assertion_issue | Confidence: 97%
  Action:    fix_assertion
  Remediation: Replace 'Non Existing Header' with the actual heading 'Products'.

  Suggested Patch:
    - await expect(page.getByRole('heading', { name: 'Non Existing Header' })).toBeVisible();
    + await expect(page.getByRole('heading', { name: 'Products' })).toBeVisible();

📋 Test Steps
  • Standard user logs in successfully
  • Page contains a heading that does not exist — assertion fails intentionally

🌐 API Traffic
  → GET https://www.saucedemo.com/
  ← 200 https://www.saucedemo.com/
─────────────────────────────────────────────────────
Attachments: test-finished-1.png, video.webm
Labels: auto-generated, playwright
Priority: Medium
```

### Deduplication

When `deduplicateByTestName: true` (default), the reporter runs a Jira JQL search before creating a bug:

```
project = "QA" AND issuetype = Bug AND status != Done
  AND summary ~ "<test name>"
```

If an open bug is found, creation is skipped and the existing issue key is logged:

```
[glossy-reporter] Jira bug skipped (duplicate) → QA-42 for: my failing test
```

### GitHub Actions example

```yaml
- name: Run tests
  run: npx playwright test
  env:
    ANTHROPIC_API_KEY: ${{ secrets.ANTHROPIC_API_KEY }}
    JIRA_BASE_URL: ${{ secrets.JIRA_BASE_URL }}
    JIRA_EMAIL: ${{ secrets.JIRA_EMAIL }}
    JIRA_API_TOKEN: ${{ secrets.JIRA_API_TOKEN }}
    JIRA_PROJECT_KEY: QA
```

### Azure Pipelines example

```yaml
- script: npx playwright test
  displayName: Run Playwright tests
  env:
    ANTHROPIC_API_KEY: $(ANTHROPIC_API_KEY)
    JIRA_BASE_URL: $(JIRA_BASE_URL)
    JIRA_EMAIL: $(JIRA_EMAIL)
    JIRA_API_TOKEN: $(JIRA_API_TOKEN)
    JIRA_PROJECT_KEY: QA
```

Store all secrets under _Pipelines → Library → Variable groups_ and link the group to the pipeline.

### Configuration reference

| Option | Type | Default | Description |
|---|---|---|---|
| `enabled` | `boolean` | — | Enable auto-bug creation |
| `projectKey` | `string` | `JIRA_PROJECT_KEY` | Jira project key, e.g. `"QA"` |
| `issueType` | `string` | `"Bug"` | Jira issue type |
| `defaultPriority` | `string` | `"Medium"` | Issue priority |
| `labels` | `string[]` | `["auto-generated","playwright"]` | Labels applied to the bug |
| `onlyForAIAnalyzed` | `boolean` | `true` | Skip tests without AI analysis |
| `deduplicateByTestName` | `boolean` | `true` | Skip if open bug exists |
| `includeScreenshots` | `boolean` | `true` | Upload screenshots as attachments |
| `includeVideos` | `boolean` | `true` | Upload video recordings as attachments |
| `includeApiTraffic` | `boolean` | `true` | Embed API request/response in description |

### Environment variable reference

| Variable | Purpose |
|---|---|
| `JIRA_BASE_URL` | Jira instance URL, e.g. `https://yourorg.atlassian.net` |
| `JIRA_EMAIL` | Atlassian account email (Basic auth) |
| `JIRA_API_TOKEN` | Jira API token |
| `JIRA_PROJECT_KEY` | Project key for auto-bug creation |
