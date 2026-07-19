# npm-package-demo

A minimal example that consumes **the published npm package** —
`playwright-spec-doc-reporter` — exactly as an external consumer would.

Unlike the other examples (which use a local `file:../..` path so they run
against your working copy), this one pins the reporter to a registry version
range (`^1.2.0` in [`package.json`](package.json)). Use it to smoke-test that a
freshly published release installs and runs cleanly.

## Run it

```bash
cd examples/npm-package-demo
npm install            # installs the reporter from npm
npx playwright install chromium
npm run test:e2e
```

The self-contained report is written to `spec-doc-report/index.html`.

> **Keep the pinned version current.** When a new version is published to npm,
> bump the `playwright-spec-doc-reporter` range in `package.json` so this demo
> exercises the latest release. (See the release notes in the root `CLAUDE.md`.)
