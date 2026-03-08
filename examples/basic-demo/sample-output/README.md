# Sample generated output structure

```text
glossy-report/
  index.html
  results.json
  healing.json
  healing.md
```

`index.html` is the glossy interactive report.

Render HTML directly from JSON (no Playwright test run):

```bash
npm run render:sample
```

Custom input/output JSON render:

```bash
npm run render:json -- samples/normalized-results.json samples/preview/custom-report.html
```
