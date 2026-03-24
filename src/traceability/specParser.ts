import { readdir, readFile } from "node:fs/promises";
import path from "node:path";

export interface SpecFile {
  filePath: string;   // e.g. "specs/basic-operations.md"
  title: string;
  scenarios: string[];
}

async function collectMarkdownFiles(dir: string): Promise<string[]> {
  const entries = await readdir(dir, { withFileTypes: true });
  const files: string[] = [];
  for (const entry of entries) {
    const fullPath = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      files.push(...(await collectMarkdownFiles(fullPath)));
    } else if (entry.name.endsWith(".md")) {
      files.push(fullPath);
    }
  }
  return files;
}

export function parseMarkdown(content: string, filePath: string): SpecFile {
  const lines = content.split("\n");
  let title = "";
  const scenarios: string[] = [];
  for (const line of lines) {
    const trimmed = line.trim();
    if (!title && trimmed.startsWith("# ")) {
      title = trimmed.slice(2).trim();
    } else if (trimmed.startsWith("## ")) {
      scenarios.push(trimmed.slice(3).trim());
    }
  }
  return { filePath, title: title || filePath, scenarios };
}

export async function parseSpecFiles(rootDir: string): Promise<SpecFile[]> {
  const specsDir = path.join(rootDir, "specs");
  let absPaths: string[];
  try {
    absPaths = await collectMarkdownFiles(specsDir);
  } catch {
    // specs/ directory absent — skip silently
    return [];
  }

  const results: SpecFile[] = [];
  for (const absPath of absPaths) {
    try {
      const content = await readFile(absPath, "utf-8");
      const relPath = path.relative(rootDir, absPath).split(path.sep).join("/");
      results.push(parseMarkdown(content, relPath));
    } catch {
      // unreadable file — skip
    }
  }
  return results;
}
