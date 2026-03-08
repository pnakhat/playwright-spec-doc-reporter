import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";

export async function ensureDir(dirPath: string): Promise<void> {
  await mkdir(dirPath, { recursive: true });
}

export async function writeJson(filePath: string, data: unknown): Promise<void> {
  await ensureDir(path.dirname(filePath));
  await writeFile(filePath, JSON.stringify(data, null, 2), "utf-8");
}

export async function writeText(filePath: string, data: string): Promise<void> {
  await ensureDir(path.dirname(filePath));
  await writeFile(filePath, data, "utf-8");
}
