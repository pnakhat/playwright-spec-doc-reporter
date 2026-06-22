---
description: Build, typecheck, and run unit tests — the standard pre-commit gate
allowed-tools: Bash(npm run build), Bash(npm run lint), Bash(npm test)
---

Run the full local verification gate and report results concisely:

1. `npm run build` — must compile `src/` → `dist/` with no errors.
2. `npm test` — Vitest unit suite must be green.

If anything fails, show the relevant error output and propose the fix. Do not edit files unless I ask.
Remember: this project is ESM/NodeNext — a common failure is a relative import missing its `.js` extension.
