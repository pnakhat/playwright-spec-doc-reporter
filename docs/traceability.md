# Spec-to-test traceability

Link Playwright Agent spec files to the tests generated from them.

> **Requires Playwright Agent ≥ 1.56** (Planner → Generator → Healer pipeline)
> See [Playwright Agent docs →](https://playwright.dev/docs/test-ai)

When tests are generated from spec files by the Playwright Agent, the reporter can surface a **Traceability** tab that maps each spec scenario to its generated test — and shows whether it passed or failed.

## How it works

1. The Playwright Agent **Planner** writes spec files under `specs/*.md`:

```markdown
# Smoke Tests

## Homepage loads successfully

Verify the application homepage responds and displays the expected content.

## Navigation works end-to-end

Ensure all primary navigation links are reachable and return valid pages.
```

2. The **Generator** creates test files with a `// spec:` header comment pointing back to the source spec:

```ts
// spec: specs/smoke.md
// seed: tests/passing.spec.ts
import { test, expect } from '@playwright/test';

test('Homepage loads successfully', async ({ page }) => {
  await page.goto('https://example.com');
  await expect(page).toHaveTitle(/Example/);
});
```

3. The reporter reads `specs/*.md`, follows the `// spec:` comments in each `.spec.ts` file, and builds a bidirectional traceability index.

## Dashboard output

The **Traceability** tab shows a two-column table:

| Spec / Scenarios | Linked Tests |
|---|---|
| ✦ Smoke Tests<br>• Homepage loads successfully<br>• Navigation works end-to-end | ✓ tests/smoke.spec.ts |

Each linked test row shows a live pass/fail/skip icon sourced from the current run.

## Output files

| File | Description |
|---|---|
| `traceability.json` | Full bidirectional spec↔test mapping |

The `traceability.json` schema:

```json
{
  "specs": [
    {
      "filePath": "specs/smoke.md",
      "title": "Smoke Tests",
      "scenarios": ["Homepage loads successfully", "Navigation works end-to-end"]
    }
  ],
  "mapping": {
    "specs/smoke.md": ["tests/smoke.spec.ts"]
  },
  "reverseMapping": {
    "tests/smoke.spec.ts": "specs/smoke.md"
  }
}
```

## Enabling traceability

No extra config required — the reporter scans for `specs/` automatically. Add the `// spec: <path>` comment to the top of any generated test file to establish the link.
