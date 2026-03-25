/**
 * Git branch / commit / push helpers for the auto-PR workflow.
 *
 * All operations run synchronously via execSync so callers can `await`
 * a simple Promise.resolve() wrapper without dealing with child-process
 * streams.  The working directory is always the Playwright project root.
 */
import { execFileSync, execSync } from "node:child_process";
import fs from "node:fs";
import path from "node:path";
import type { HealingPayload } from "../types/index.js";

export interface BranchResult {
  branchName: string;
  commitSha: string;
  patchedFiles: string[];
  skippedFiles: string[];
}

// ─── Helpers ───────────────────────────────────────────────────────────────────

function slugify(s: string): string {
  return s
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 40);
}

function timestamp(): string {
  return new Date().toISOString().replace(/[:.]/g, "-").slice(0, 19);
}

function run(cmd: string, cwd: string): string {
  return execSync(cmd, { cwd, encoding: "utf-8", stdio: ["pipe", "pipe", "pipe"] }).trim();
}

/** Returns the current branch name (or commit SHA on detached HEAD). */
export function currentBranch(cwd: string): string {
  try {
    return run("git rev-parse --abbrev-ref HEAD", cwd);
  } catch {
    return run("git rev-parse --short HEAD", cwd);
  }
}

// ─── Patch application ─────────────────────────────────────────────────────────

/**
 * Apply a `suggestedPatch` string (unified diff) to an absolute file path.
 * Falls back to a simple string replacement when the patch contains a
 * recognisable "- old / + new" pair inside a diff block.
 * Returns true when the file was actually modified.
 */
function applyPatch(absoluteFile: string, patch: string, createBackup: boolean): boolean {
  let original: string;
  try {
    original = fs.readFileSync(absoluteFile, "utf-8");
  } catch {
    return false;
  }

  // Extract the first "- line / + line" pair from the diff
  const removedLines: string[] = [];
  const addedLines: string[] = [];
  for (const line of patch.split("\n")) {
    if (line.startsWith("-") && !line.startsWith("---")) removedLines.push(line.slice(1));
    if (line.startsWith("+") && !line.startsWith("+++")) addedLines.push(line.slice(1));
  }

  if (removedLines.length === 0 || addedLines.length === 0) return false;

  let content = original;
  for (let i = 0; i < Math.min(removedLines.length, addedLines.length); i++) {
    if (content.includes(removedLines[i])) {
      content = content.replace(removedLines[i], addedLines[i]);
    }
  }

  if (content === original) return false;

  if (createBackup) {
    fs.writeFileSync(absoluteFile + ".backup", original, "utf-8");
  }
  fs.writeFileSync(absoluteFile, content, "utf-8");
  return true;
}

// ─── Main ──────────────────────────────────────────────────────────────────────

export interface BranchManagerOptions {
  payloads: HealingPayload[];
  cwd: string;
  minConfidence: number;
  createBackup: boolean;
}

/**
 * 1. Create a topic branch `autofix/<slug>-<timestamp>`
 * 2. Apply patches from `payloads` (filtered by minConfidence)
 * 3. Stage and commit all changed files
 * 4. Push the branch
 *
 * Returns metadata needed by the PR creator.
 * Throws if git operations fail.
 */
export async function createAutofixBranch(opts: BranchManagerOptions): Promise<BranchResult> {
  const { payloads, cwd, minConfidence, createBackup } = opts;

  // Build branch name from the first high-confidence payload's test name
  const anchor = payloads.find(p => p.confidence >= minConfidence)?.testName ?? "tests";
  const branchName = `autofix/${slugify(anchor)}-${timestamp()}`;

  // Stash any in-flight local changes so we start from a clean state.
  // Track whether *we* created a new entry so we don't pop a pre-existing stash.
  const stashBefore = run("git stash list", cwd);
  run(`git stash push -m "glossy-autofix-stash-${timestamp()}" --include-untracked`, cwd);
  const stashAfter = run("git stash list", cwd);
  const createdStash = stashAfter !== stashBefore;

  try {
    run(`git checkout -b ${branchName}`, cwd);
  } catch {
    // Branch might already exist on a re-run — use unique timestamp so this shouldn't happen
    throw new Error(`Failed to create branch "${branchName}"`);
  }

  const patchedFiles: string[] = [];
  const skippedFiles: string[] = [];

  for (const payload of payloads) {
    if (payload.confidence < minConfidence) {
      skippedFiles.push(payload.file);
      continue;
    }
    if (!payload.suggestedPatch) {
      skippedFiles.push(payload.file);
      continue;
    }

    const absFile = path.resolve(cwd, payload.file);
    const patched = applyPatch(absFile, payload.suggestedPatch, createBackup);
    if (patched) {
      patchedFiles.push(payload.file);
    } else {
      skippedFiles.push(payload.file);
    }
  }

  if (patchedFiles.length === 0) {
    // Nothing to commit — restore original branch
    run(`git checkout -`, cwd);
    run(`git branch -D ${branchName}`, cwd);
    if (createdStash) run("git stash pop", cwd);
    throw new Error("No patches could be applied (confidence too low or no suggestedPatch provided).");
  }

  // Stage patched files
  for (const f of patchedFiles) {
    run(`git add "${f}"`, cwd);
  }

  // Commit
  const testList = patchedFiles.map(f => `  - ${f}`).join("\n");
  const message = [
    `fix(autofix): apply AI-suggested locator patches`,
    ``,
    `Playwright Glossy auto-healer applied fixes to ${patchedFiles.length} file(s):`,
    testList,
    ``,
    `Skipped (below confidence threshold): ${skippedFiles.length}`,
    ``,
    `Co-Authored-By: Glossy AI Healer <noreply@glossy-reporter>`,
  ].join("\n");

  execFileSync("git", ["commit", "-m", message], { cwd, encoding: "utf-8", stdio: ["pipe", "pipe", "pipe"] });

  const commitSha = run("git rev-parse --short HEAD", cwd);

  // Push
  run(`git push -u origin ${branchName}`, cwd);

  // Restore stash on base branch
  run(`git checkout -`, cwd);
  if (createdStash) {
    try { run("git stash pop", cwd); } catch { /* stash may be clean */ }
  }

  return { branchName, commitSha, patchedFiles, skippedFiles };
}

// ─── CLI path: commit already-patched files ─────────────────────────────────

export interface CommitAndPROptions {
  /** Files already modified on disk by the healing agent — just stage + commit. */
  patchedFiles: string[];
  cwd: string;
  /** Short description used in branch name and commit message. */
  context?: string;
}

/**
 * Used by the healing agent CLI (`--create-pr`) after Claude has already
 * written fixes to disk.  Creates a branch, stages the given files,
 * commits, and pushes.
 */
export async function commitPatchedFiles(opts: CommitAndPROptions): Promise<BranchResult> {
  const { patchedFiles, cwd, context } = opts;

  if (patchedFiles.length === 0) {
    throw new Error("No patched files to commit.");
  }

  const anchor = context ?? patchedFiles[0] ?? "tests";
  const branchName = `autofix/${slugify(anchor)}-${timestamp()}`;

  run(`git checkout -b ${branchName}`, cwd);

  for (const f of patchedFiles) {
    run(`git add "${f}"`, cwd);
  }

  const fileList = patchedFiles.map(f => `  - ${f}`).join("\n");
  const message = [
    `fix(autofix): apply AI-suggested patches`,
    ``,
    `Playwright Glossy Healing Agent patched ${patchedFiles.length} file(s) via Claude:`,
    fileList,
    ``,
    `Co-Authored-By: Glossy AI Healer <noreply@glossy-reporter>`,
  ].join("\n");

  execFileSync("git", ["commit", "-m", message], { cwd, encoding: "utf-8", stdio: ["pipe", "pipe", "pipe"] });
  const commitSha = run("git rev-parse --short HEAD", cwd);
  run(`git push -u origin ${branchName}`, cwd);

  // Return to previous branch
  run(`git checkout -`, cwd);

  return { branchName, commitSha, patchedFiles, skippedFiles: [] };
}
