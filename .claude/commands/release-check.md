---
description: Pre-publish checklist for a new npm release
allowed-tools: Bash(npm run build), Bash(npm test), Bash(git status), Bash(git diff:*), Bash(git log:*), Bash(npm pack --dry-run)
---

Run a release readiness check. Do NOT publish or bump the version — that is automated in CI on merge
to `main`. Just verify and report:

1. Working tree is clean (`git status`).
2. `npm run build` succeeds and `npm test` is green.
3. `npm pack --dry-run` — confirm only `dist/` (and package metadata) ship; no source, tests, or examples leak.
4. Summarize commits since the last `chore: release` tag (`git log`) so I can sanity-check the changelog.

Flag anything that would break consumers: changed public exports in `src/index.ts`, ESM import
regressions (missing `.js` extensions), or an accidental new runtime dependency in `package.json`.
