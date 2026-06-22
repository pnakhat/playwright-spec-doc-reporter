---
description: Scaffold a new AI failure-analysis provider
argument-hint: <provider-name>
allowed-tools: Read, Edit, Write, Bash, Grep, Glob
---

Add a new AI failure-analysis provider named **$1** to `src/ai/providers/`.

Steps:
1. Read an existing provider (`src/ai/providers/openaiProvider.ts`, `anthropicProvider.ts`) and
   `src/ai/analysisService.ts` to learn the provider interface and how providers are selected/wired.
2. Create `src/ai/providers/$1Provider.ts` implementing the same interface. Read configuration/API keys
   from environment variables only — never hardcode secrets, never log them.
3. Wire it into the provider selection logic in `analysisService.ts` (and `config/defaults.ts` if a new
   option value is needed).
4. Add a unit test in `tests/` following the pattern in `tests/azureProvider.test.ts`, importing with
   `.js` extensions.
5. Run `npm run build && npm test` and iterate until green.
6. Note any README documentation that should be updated for the new provider option.
