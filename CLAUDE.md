# CLAUDE.md

Guidance for Claude Code (and other agents) working in this repository.

## What this is

`playwright-spec-doc-reporter` — a zero-runtime-dependency Playwright HTML reporter that
produces a single self-contained `index.html`. Features: BDD/Gherkin annotations, AI-powered
failure analysis, self-healing locator suggestions + auto-PR generation, Jira/Xray bug & comment
integration, spec-to-test traceability, Cucumber ingestion, manual-test merging, flakiness scoring,
and history/trends.

Published to npm as an **ESM-only** package. Consumers use it via `playwright.config.ts`.

## Golden rules

- **ESM-only, NodeNext.** Every relative import MUST use an explicit `.js` extension, even from
  `.ts` files (e.g. `import { x } from "../utils/fs.js"`). This applies in `src/` AND `tests/`.
- **Zero runtime dependencies.** `package.json` has no `dependencies` block — only `peerDependencies`
  (`@playwright/test`) and `devDependencies`. Do not add a runtime dep without explicit approval; the
  output HTML must stay self-contained (CSS/JS inlined, no CDN links). **Exception:** the optional MCP
  server (`src/mcp/`) uses `optionalDependencies` (`@modelcontextprotocol/sdk`, `zod`, `express`,
  `chokidar`). These are lazy-loaded via dynamic `import()` so the core reporter never pulls them in;
  the `mcp` CLI command prints an install hint and exits if they are absent.
- **Never edit `dist/`.** It is build output (gitignored). Edit `src/`, then `npm run build`.
- **Secrets stay out of code.** API keys (OpenAI/Anthropic/Azure, Jira) come from env vars only.
  Never hardcode or log them.
- **Match the surrounding style.** 2-space indent, double quotes, named exports, section-divider
  comments (`// ─── Title ───`). Tests use `describe`/`it`/`expect` from `vitest`.

## Commands

| Task | Command |
|------|---------|
| Build (compile `src/` → `dist/`) | `npm run build` |
| Typecheck only (lint) | `npm run lint` (`tsc --noEmit`) |
| Unit tests | `npm test` (`vitest run`) |
| Unit tests (watch) | `npm run test:watch` |
| E2E report-UI tests | `npm run test:e2e` (needs `npx playwright install chromium`) |
| Render a sample report | `npm run render:sample` → `examples/basic-demo/sample-output/index.html` |
| Clean | `npm run clean` |

**Before declaring any change done, run `npm run build && npm test`.** CI (`.github/workflows/ci.yml`)
runs build → unit tests → example API/UI tests → E2E report tests, then runs the release job on merge
to `main`.

### Releasing

Releases are **intentional, not automatic-per-merge** (publish-on-version-change):

- To cut a release, **bump `version` in `package.json` in your PR**. On merge to `main`, the `auto-release`
  job publishes that version to npm (with provenance) and tags `v<version>` — but only if that version is
  not already on npm.
- A merge that does **not** change the version is a **no-op** — nothing is published.
- A version can also be published by pushing a manual `v<version>` git tag (the `publish-npm` job). The
  `auto-release` job is idempotent against this: it skips publishing/tagging a version already on npm, so
  merging the same release to `main` afterward won't double-publish.

## Architecture (`src/`)

| Area | Path | Responsibility |
|------|------|----------------|
| Public API | `index.ts` | `generateReport`, `analyzeFailures`, re-exported types |
| Reporter | `reporter/glossyReporter.ts` | Playwright `Reporter` class — the runtime entry point |
| Annotations | `annotations.ts` | BDD helpers: `addFeature`, `addScenario`, `addBehaviour`, `addApiRequest/Response` |
| Types | `types/index.ts` | Shared domain types — start here to understand the data model |
| Config | `config/defaults.ts` | Default reporter options |
| Report generation | `generator/` | `reportGenerator.ts` orchestrates; `template/` holds the HTML (`styles`, `markup`, `scriptInit`, `scriptRenderers`, `scriptInteractions`, `scriptUtils`) |
| AI analysis | `ai/` | `analysisService.ts`, `prompt.ts`, pluggable `providers/` (openai, anthropic, azure, azureClaude) |
| Self-healing | `healing/` | `diffParser`, `healingDetector`, `healingAgent`, `payload`, `HealingIndex` |
| Auto-fix PRs | `autofix/` | `branchManager`, `prGenerator` (GitHub/Azure DevOps draft PRs) |
| Traceability | `traceability/` | maps `specs/*.md` → tests via `// spec:` comments |
| Cucumber | `cucumber/` | adapter, detector, World annotation helpers |
| Jira | `jira/` | `jiraClient`, `commentBuilder`, `bugCreator` (ADF formatting) |
| Manual tests | `manual/parser.ts` | merge hand-authored Gherkin/prose results |
| PR comment | `prComment/generator.ts` | compact markdown summary for PR comments |
| MCP server | `mcp/` | MCP server over the reporter's artifacts. `server.ts` (stdio/SSE/watch), `cli.ts` + `bin/cli.js` (`mcp` command), `tools/` (one factory per tool), `loader.ts` (reads results/history/traceability JSON). Optional-dep, lazy-loaded. |
| Utils | `utils/` | `report`, `flakiness`, `fs` |

The browser-side report logic lives as **strings** in `src/generator/template/` and is inlined into
the output HTML — there is no separate frontend build. When touching report UI, edit those modules and
verify with `npm run render:sample`, then open the generated HTML.

## Testing conventions

- Unit tests: `tests/*.test.ts`, run by Vitest. One file per module under test.
- Import the unit under test from `../src/...` with a `.js` extension.
- E2E tests: `tests/e2e/` drive the generated HTML report with Playwright.
- Add/extend a unit test for every behavioral change to a `src/` module.

## Agentic workflow

- Custom subagents live in `.claude/agents/` — delegate to them for focused work.
- Project slash commands live in `.claude/commands/` (e.g. `/verify`, `/release-check`,
  `/add-ai-provider`).
- Project skills live in `.claude/skills/`.
- Long-lived facts and decisions go in this file or nested `CLAUDE.md` files; keep them terse.
