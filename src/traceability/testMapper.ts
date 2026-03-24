import { readFile } from "node:fs/promises";
import fs from "node:fs";
import path from "node:path";
import type { Suite } from "@playwright/test/reporter";

export type TestFileMap = Map<string, string[]>;
// key:   "specs/basic-operations.md"
// value: ["tests/create/add-valid-todo.spec.ts", ...]

function parseSpecComment(content: string): string | undefined {
  const lines = content.split("\n").slice(0, 5);
  for (const line of lines) {
    const match = line.match(/\/\/\s*spec:\s*(.+)/);
    if (match) return match[1].trim();
  }
  return undefined;
}

function collectSpecFilePaths(suite: Suite): string[] {
  const files = new Set<string>();
  for (const test of suite.allTests()) {
    const f = test.location.file;
    if (f.endsWith(".spec.ts")) files.add(f);
  }
  return [...files];
}

/** Async variant — for unit testing. Uses fs/promises. */
export async function buildTestFileMap(suite: Suite, rootDir: string): Promise<TestFileMap> {
  const map: TestFileMap = new Map();
  for (const absFile of collectSpecFilePaths(suite)) {
    try {
      const content = await readFile(absFile, "utf-8");
      const specPath = parseSpecComment(content);
      if (specPath) {
        const relTestFile = path.relative(rootDir, absFile).split(path.sep).join("/");
        const existing = map.get(specPath) ?? [];
        existing.push(relTestFile);
        map.set(specPath, existing);
      }
    } catch {
      // unreadable file — skip
    }
  }
  return map;
}

/** Sync variant — used by the reporter's onBegin hook. */
export function buildTestFileMapSync(suite: Suite, rootDir: string): TestFileMap {
  const map: TestFileMap = new Map();
  for (const absFile of collectSpecFilePaths(suite)) {
    try {
      const content = fs.readFileSync(absFile, "utf-8");
      const specPath = parseSpecComment(content);
      if (specPath) {
        const relTestFile = path.relative(rootDir, absFile).split(path.sep).join("/");
        const existing = map.get(specPath) ?? [];
        existing.push(relTestFile);
        map.set(specPath, existing);
      }
    } catch {
      // unreadable file — skip
    }
  }
  return map;
}
