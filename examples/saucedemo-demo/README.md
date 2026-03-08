# SauceDemo Demo Project

This sample validates `playwright-spec-doc-reporter` using:

- SauceDemo UI tests
- Public API tests
- Glossy HTML + JSON + healing exports

## Included tests

- `tests/ui/login-and-cart.spec.ts`
  - successful login + add-to-cart
  - locked out user validation
  - intentional failure for AI/healing demonstration
- `tests/api/public-api.spec.ts`
  - GET list
  - GET single resource
  - POST resource

## Run

From repo root:

```bash
npm run build
cd examples/saucedemo-demo
npm install
npx playwright install --with-deps chromium
npm test
```

Optional AI analysis:

```bash
export OPENAI_API_KEY=your_key
npm test
```

## Output

Generated in `examples/saucedemo-demo/glossy-report/`:

- `index.html`
- `results.json`
- `healing.json`
- `healing.md`
