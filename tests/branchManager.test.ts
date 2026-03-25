/**
 * Unit tests for branchManager.ts
 *
 * Git commands (execSync) are fully mocked so no real git operations run.
 * Tests cover:
 * - createAutofixBranch: patch application, confidence filtering, commit/push
 * - commitPatchedFiles: staging already-fixed files and pushing
 * - applyPatch logic (via createAutofixBranch with real temp files)
 * - error paths: no patches applied, branch creation failure
 */
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { HealingPayload } from "../src/types/index.js";

// ---------------------------------------------------------------------------
// Mock execSync before importing the module under test
// ---------------------------------------------------------------------------

const execSyncMock = vi.fn().mockReturnValue("");

vi.mock("node:child_process", () => ({
  execSync:     (...args: unknown[]) => execSyncMock(...args),
  // execFileSync is now used for `git commit` to prevent shell injection
  execFileSync: (...args: unknown[]) => execSyncMock(...args),
}));

// Import AFTER mocking so the module picks up the mock
const { createAutofixBranch, commitPatchedFiles, currentBranch } = await import(
  "../src/autofix/branchManager.js"
);

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function basePayload(overrides: Partial<HealingPayload> = {}): HealingPayload {
  return {
    testName: "login works",
    file: "tests/login.spec.ts",
    confidence: 0.9,
    actionType: "update_locator",
    failedLocator: "#old-btn",
    candidateLocators: ["[data-testid=btn]"],
    // Standard unified-diff format: "-old\n+new" (no space after - / +)
    // applyPatch uses slice(1), so leading space would cause the match to fail
    suggestedPatch: "-page.click('#old-btn')\n+page.click('[data-testid=btn]')",
    reasoning: "DOM updated",
    ...overrides,
  };
}

// ---------------------------------------------------------------------------
// currentBranch
// ---------------------------------------------------------------------------

describe("currentBranch", () => {
  it("returns the branch name from git rev-parse", () => {
    execSyncMock.mockReturnValueOnce("main\n");
    expect(currentBranch("/some/cwd")).toBe("main");
  });

  it("falls back to commit SHA on detached HEAD", () => {
    execSyncMock
      .mockImplementationOnce(() => { throw new Error("detached HEAD"); })
      .mockReturnValueOnce("abc1234\n");
    expect(currentBranch("/some/cwd")).toBe("abc1234");
  });
});

// ---------------------------------------------------------------------------
// createAutofixBranch — confidence filtering
// ---------------------------------------------------------------------------

describe("createAutofixBranch — confidence filtering", () => {
  let tmpDir: string;
  let testFile: string;

  beforeEach(() => {
    tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), "glossy-test-"));
    testFile = path.join(tmpDir, "tests/login.spec.ts");
    fs.mkdirSync(path.dirname(testFile), { recursive: true });
    fs.writeFileSync(testFile, "page.click('#old-btn');\n", "utf-8");

    // Reset mock: stash list empty, git stash, checkout -b, push, stash list again all succeed
    execSyncMock.mockReturnValue("");
  });

  afterEach(() => {
    fs.rmSync(tmpDir, { recursive: true, force: true });
    vi.clearAllMocks();
  });

  it("throws when no payloads meet confidence threshold", async () => {
    const payload = basePayload({ confidence: 0.3 }); // below default 0.7
    await expect(
      createAutofixBranch({ payloads: [payload], cwd: tmpDir, minConfidence: 0.7, createBackup: false })
    ).rejects.toThrow("No patches could be applied");
  });

  it("skips payloads without suggestedPatch", async () => {
    const payload = basePayload({ suggestedPatch: undefined });
    await expect(
      createAutofixBranch({ payloads: [payload], cwd: tmpDir, minConfidence: 0.5, createBackup: false })
    ).rejects.toThrow("No patches could be applied");
  });

  it("applies patch and returns patchedFiles when diff is valid", async () => {
    // Write a file that matches the "- " line in the patch
    fs.writeFileSync(testFile, "page.click('#old-btn');\n", "utf-8");

    // stash list BEFORE is non-empty; stash list AFTER adds a new entry → createdStash=true → pop
    execSyncMock
      .mockReturnValueOnce("stash@{0}: old\n")                    // git stash list BEFORE
      .mockReturnValueOnce("")                                      // git stash push
      .mockReturnValueOnce("stash@{0}: glossy\nstash@{1}: old\n") // git stash list AFTER (new entry)
      .mockReturnValueOnce("")                                      // git checkout -b
      .mockReturnValueOnce("")                                      // git add
      .mockReturnValueOnce("")                                      // git commit (execFileSync)
      .mockReturnValueOnce("abc1234\n")                            // git rev-parse --short HEAD
      .mockReturnValueOnce("")                                      // git push
      .mockReturnValueOnce("")                                      // git checkout -
      .mockReturnValueOnce("");                                     // git stash pop

    const result = await createAutofixBranch({
      payloads: [basePayload({ file: "tests/login.spec.ts" })],
      cwd: tmpDir,
      minConfidence: 0.7,
      createBackup: false,
    });

    expect(result.patchedFiles).toContain("tests/login.spec.ts");
    expect(result.commitSha).toBe("abc1234");
    expect(result.branchName).toMatch(/^autofix\//);
  });

  it("creates a .backup file when createBackup=true", async () => {
    fs.writeFileSync(testFile, "page.click('#old-btn');\n", "utf-8");

    execSyncMock
      .mockReturnValueOnce("")        // git stash list BEFORE (empty)
      .mockReturnValueOnce("")        // git stash push
      .mockReturnValueOnce("")        // git stash list AFTER (empty — no new stash, no pop needed)
      .mockReturnValueOnce("")        // git checkout -b
      .mockReturnValueOnce("")        // git add
      .mockReturnValueOnce("")        // git commit (execFileSync)
      .mockReturnValueOnce("sha\n")   // rev-parse
      .mockReturnValueOnce("")        // git push
      .mockReturnValueOnce("");       // git checkout -

    await createAutofixBranch({
      payloads: [basePayload({ file: "tests/login.spec.ts" })],
      cwd: tmpDir,
      minConfidence: 0.7,
      createBackup: true,
    });

    expect(fs.existsSync(testFile + ".backup")).toBe(true);
  });

  it("uses minConfidence to skip low-confidence payloads", async () => {
    const highConf = basePayload({ confidence: 0.9, file: "tests/login.spec.ts" });
    const lowConf = basePayload({ confidence: 0.4, file: "tests/login.spec.ts", suggestedPatch: "-x\n+y" });

    fs.writeFileSync(testFile, "page.click('#old-btn');\n", "utf-8");

    execSyncMock.mockReturnValue("sha\n");

    const result = await createAutofixBranch({
      payloads: [highConf, lowConf],
      cwd: tmpDir,
      minConfidence: 0.7,
      createBackup: false,
    });

    expect(result.skippedFiles).toContain("tests/login.spec.ts");
  });
});

// ---------------------------------------------------------------------------
// commitPatchedFiles
// ---------------------------------------------------------------------------

describe("commitPatchedFiles", () => {
  afterEach(() => {
    vi.clearAllMocks();
  });

  it("throws when patchedFiles is empty", async () => {
    await expect(
      commitPatchedFiles({ patchedFiles: [], cwd: "/repo", context: "test" })
    ).rejects.toThrow("No patched files to commit");
  });

  it("creates a branch named autofix/<slug>-<timestamp>", async () => {
    execSyncMock.mockReturnValue("sha\n");

    const result = await commitPatchedFiles({
      patchedFiles: ["tests/login.spec.ts"],
      cwd: "/repo",
      context: "login test fix",
    });

    expect(result.branchName).toMatch(/^autofix\/login-test-fix-/);
  });

  it("returns all patchedFiles in result", async () => {
    execSyncMock.mockReturnValue("abc\n");

    const result = await commitPatchedFiles({
      patchedFiles: ["tests/a.spec.ts", "tests/b.spec.ts"],
      cwd: "/repo",
    });

    expect(result.patchedFiles).toEqual(["tests/a.spec.ts", "tests/b.spec.ts"]);
    expect(result.skippedFiles).toEqual([]);
  });

  it("returns commitSha from git rev-parse", async () => {
    execSyncMock
      .mockReturnValueOnce("")          // git checkout -b
      .mockReturnValueOnce("")          // git add
      .mockReturnValueOnce("")          // git commit
      .mockReturnValueOnce("deadbeef\n") // git rev-parse --short HEAD
      .mockReturnValueOnce("")          // git push
      .mockReturnValueOnce("");         // git checkout -

    const result = await commitPatchedFiles({
      patchedFiles: ["tests/login.spec.ts"],
      cwd: "/repo",
    });

    expect(result.commitSha).toBe("deadbeef");
  });

  it("calls git add for each patched file", async () => {
    execSyncMock.mockReturnValue("sha\n");

    await commitPatchedFiles({
      patchedFiles: ["tests/a.spec.ts", "tests/b.spec.ts"],
      cwd: "/repo",
    });

    const calls = execSyncMock.mock.calls as [string, ...unknown[]][];
    const addCalls = calls.filter(([cmd]) => cmd.startsWith("git add"));
    expect(addCalls).toHaveLength(2);
  });

  it("calls git push with -u origin", async () => {
    execSyncMock.mockReturnValue("sha\n");

    await commitPatchedFiles({
      patchedFiles: ["tests/login.spec.ts"],
      cwd: "/repo",
    });

    const calls = execSyncMock.mock.calls as [string, ...unknown[]][];
    const pushCall = calls.find(([cmd]) => cmd.startsWith("git push"));
    expect(pushCall).toBeTruthy();
    expect(pushCall![0]).toContain("-u origin");
  });

  it("returns to previous branch with git checkout -", async () => {
    execSyncMock.mockReturnValue("sha\n");

    await commitPatchedFiles({
      patchedFiles: ["tests/login.spec.ts"],
      cwd: "/repo",
    });

    const calls = execSyncMock.mock.calls as [string, ...unknown[]][];
    const checkoutCalls = calls.filter(([cmd]) => cmd === "git checkout -");
    expect(checkoutCalls.length).toBeGreaterThanOrEqual(1);
  });

  it("uses first file as anchor when context is not provided", async () => {
    execSyncMock.mockReturnValue("sha\n");

    const result = await commitPatchedFiles({
      patchedFiles: ["tests/my-feature.spec.ts"],
      cwd: "/repo",
      // no context
    });

    expect(result.branchName).toMatch(/^autofix\/tests-my-feature-spec-ts-/);
  });

  it("uses execFileSync (not execSync) for git commit to prevent shell injection", async () => {
    execSyncMock.mockReturnValue("sha\n");

    await commitPatchedFiles({
      patchedFiles: ["tests/login.spec.ts"],
      cwd: "/repo",
    });

    // execFileSync is routed through the same mock — verify commit was called with an array of args
    // (first arg is "git", second is an array ["commit", "-m", ...])
    const calls = execSyncMock.mock.calls as unknown[][];
    const commitCall = calls.find(([cmd, args]) => cmd === "git" && Array.isArray(args) && (args as string[]).includes("commit"));
    expect(commitCall).toBeTruthy();
  });
});

// ---------------------------------------------------------------------------
// createAutofixBranch — stash safety
// ---------------------------------------------------------------------------

describe("createAutofixBranch — stash safety", () => {
  let tmpDir: string;
  let testFile: string;

  beforeEach(() => {
    tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), "glossy-stash-"));
    testFile = path.join(tmpDir, "tests/login.spec.ts");
    fs.mkdirSync(path.dirname(testFile), { recursive: true });
    fs.writeFileSync(testFile, "page.click('#old-btn');\n", "utf-8");
    vi.clearAllMocks();
  });

  afterEach(() => {
    fs.rmSync(tmpDir, { recursive: true, force: true });
    vi.clearAllMocks();
  });

  it("pops stash only when this run created a new stash entry", async () => {
    // stash list differs before/after → createdStash=true → pop expected
    execSyncMock
      .mockReturnValueOnce("")                          // stash list BEFORE (empty)
      .mockReturnValueOnce("")                          // stash push
      .mockReturnValueOnce("stash@{0}: glossy\n")      // stash list AFTER (new entry added)
      .mockReturnValueOnce("")                          // checkout -b
      .mockReturnValueOnce("")                          // git add
      .mockReturnValueOnce("")                          // commit (execFileSync)
      .mockReturnValueOnce("sha\n")                    // rev-parse
      .mockReturnValueOnce("")                          // git push
      .mockReturnValueOnce("")                          // checkout -
      .mockReturnValueOnce("");                         // stash pop

    await createAutofixBranch({
      payloads: [basePayload({ file: "tests/login.spec.ts" })],
      cwd: tmpDir, minConfidence: 0.7, createBackup: false,
    });

    const calls = execSyncMock.mock.calls as [string, ...unknown[]][];
    const popCall = calls.find(([cmd]) => typeof cmd === "string" && cmd === "git stash pop");
    expect(popCall).toBeTruthy();
  });

  it("does NOT pop stash when stash list is unchanged (no local changes were stashed)", async () => {
    // stash list same before and after → createdStash=false → no pop
    execSyncMock
      .mockReturnValueOnce("stash@{0}: existing\n")    // stash list BEFORE
      .mockReturnValueOnce("")                          // stash push (nothing to stash)
      .mockReturnValueOnce("stash@{0}: existing\n")    // stash list AFTER (unchanged)
      .mockReturnValueOnce("")                          // checkout -b
      .mockReturnValueOnce("")                          // git add
      .mockReturnValueOnce("")                          // commit (execFileSync)
      .mockReturnValueOnce("sha\n")                    // rev-parse
      .mockReturnValueOnce("")                          // git push
      .mockReturnValueOnce("");                         // checkout -

    await createAutofixBranch({
      payloads: [basePayload({ file: "tests/login.spec.ts" })],
      cwd: tmpDir, minConfidence: 0.7, createBackup: false,
    });

    const calls = execSyncMock.mock.calls as [string, ...unknown[]][];
    const popCall = calls.find(([cmd]) => typeof cmd === "string" && cmd === "git stash pop");
    expect(popCall).toBeUndefined();
  });
});
