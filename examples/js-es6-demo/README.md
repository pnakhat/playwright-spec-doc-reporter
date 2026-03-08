# JS ES6 Demo

A plain **JavaScript ES6** example showing `playwright-spec-doc-reporter` working without TypeScript.

All test files are `.spec.js` and the config is `playwright.config.js`.

## Run

```bash
npm install
npm test
open spec-doc-report/index.html
```

## How annotations work in JS

Import the local `annotations.mjs` shim (which uses the project's own `@playwright/test`) instead of importing directly from the reporter package. This avoids a double-playwright-instance conflict:

```js
import { addFeature, addScenario, addBehaviour, addApiRequest, addApiResponse } from "../annotations.mjs";
```

When installing from npm in a real project, you can use the sub-path export instead:

```js
import { addFeature, addScenario, addBehaviour } from "playwright-spec-doc-reporter/annotations";
```

## Files

| File | Purpose |
|------|---------|
| `playwright.config.js` | Playwright config (JS, no TypeScript) |
| `reporter.mjs` | Thin shim that re-exports the reporter from the repo root `dist/` |
| `annotations.mjs` | Local annotation helpers (avoids double-playwright conflict) |
| `tests/posts-api.spec.js` | Posts API tests with inline request/response display |
| `tests/users-api.spec.js` | Users API tests with BDD annotations |
