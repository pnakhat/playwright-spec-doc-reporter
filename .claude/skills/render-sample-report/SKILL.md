---
name: render-sample-report
description: Build the reporter and render a sample HTML report from fixture JSON, then inspect the output. Use when verifying changes to report generation or the HTML template, or when the user wants to see the report rendered.
---

# Render a sample report

The reporter emits a single self-contained `index.html`. To see your changes rendered:

## Quick render (canonical sample)
```bash
npm run render:sample
```
This builds `src/` and renders `samples/normalized-results.json` to
`examples/basic-demo/sample-output/index.html`.

## Render arbitrary normalized JSON
```bash
npm run render:json -- <path/to/normalized-results.json> <path/to/output/index.html>
```

## Render the SauceDemo seeded sample (richer data: failures, AI, media)
```bash
npm run render:saucedemo
```

## After rendering
1. Read the generated `index.html` to confirm structure/inlined assets, or open it in a browser.
2. The output must remain self-contained — no external CSS/JS/CDN references.
3. For interaction/behavior changes, also run the E2E suite:
   ```bash
   npx playwright install chromium   # first time only
   npm run test:e2e
   ```

## Where the report code lives
Template source (inlined strings, no frontend build): `src/generator/template/`
(`styles.ts`, `markup.ts`, `scriptInit.ts`, `scriptRenderers.ts`, `scriptInteractions.ts`,
`scriptUtils.ts`, assembled by `index.ts`). Orchestration: `src/generator/reportGenerator.ts`.
Helper scripts: `scripts/render-from-json.mjs`, `scripts/seed-and-render-saucedemo.mjs`,
`scripts/check-media-paths.mjs`.
