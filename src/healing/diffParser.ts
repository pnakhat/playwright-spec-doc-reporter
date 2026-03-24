export interface DiffHunk {
  removedLines: string[];
  addedLines: string[];
}

export interface HealingDiff {
  testFilePath: string;   // e.g. "tests/create/add-valid-todo.spec.ts"
  hunks: DiffHunk[];
  locatorsBefore: string[];  // extracted old locator strings
  locatorsAfter: string[];   // extracted new locator strings
  patchSummary: string;      // human-readable: "1 locator updated"
}

// Matches the first string argument of:
//   page.getByRole('...') / getByText / getByLabel / getByTestId / getByPlaceholder
//   page.locator('...')
const LOCATOR_PATTERN =
  /page\.(?:getByRole|getByText|getByLabel|getByTestId|getByPlaceholder|locator)\s*\(\s*(['"`])(.*?)\1/g;

function extractLocators(lines: string[]): string[] {
  const results: string[] = [];
  for (const line of lines) {
    const re = new RegExp(LOCATOR_PATTERN.source, "g");
    let match: RegExpExecArray | null;
    while ((match = re.exec(line)) !== null) {
      if (match[2]) results.push(match[2]);
    }
  }
  return results;
}

/**
 * Parse the raw text output of `git diff HEAD -- tests/` into HealingDiff objects.
 * Only files ending with `.spec.ts` are processed.
 */
export function parseDiff(diffText: string): HealingDiff[] {
  if (!diffText || !diffText.trim()) return [];

  const results: HealingDiff[] = [];

  // Each file section starts with "diff --git a/... b/..."
  const fileSections = diffText.split(/^diff --git /m).filter(Boolean);

  for (const section of fileSections) {
    const filePathMatch = section.match(/^a\/(.+?) b\//);
    if (!filePathMatch) continue;

    const testFilePath = filePathMatch[1];
    if (!testFilePath.endsWith(".spec.ts")) continue;

    const hunks: DiffHunk[] = [];

    // Each hunk starts with "@@ ... @@"
    const hunkParts = section.split(/^@@[^@\n]*@@[^\n]*/m).slice(1);
    for (const hunkText of hunkParts) {
      const removedLines: string[] = [];
      const addedLines: string[] = [];
      for (const line of hunkText.split("\n")) {
        if (line.startsWith("-") && !line.startsWith("---")) {
          removedLines.push(line.slice(1));
        } else if (line.startsWith("+") && !line.startsWith("+++")) {
          addedLines.push(line.slice(1));
        }
      }
      if (removedLines.length > 0 || addedLines.length > 0) {
        hunks.push({ removedLines, addedLines });
      }
    }

    if (hunks.length === 0) continue;

    const allRemoved = hunks.flatMap(h => h.removedLines);
    const allAdded = hunks.flatMap(h => h.addedLines);
    const locatorsBefore = extractLocators(allRemoved);
    const locatorsAfter = extractLocators(allAdded);

    const locatorCount = Math.max(locatorsBefore.length, locatorsAfter.length);
    const patchSummary =
      locatorCount === 0
        ? `${hunks.length} hunk${hunks.length !== 1 ? "s" : ""} changed`
        : `${locatorCount} locator${locatorCount !== 1 ? "s" : ""} updated`;

    results.push({ testFilePath, hunks, locatorsBefore, locatorsAfter, patchSummary });
  }

  return results;
}
