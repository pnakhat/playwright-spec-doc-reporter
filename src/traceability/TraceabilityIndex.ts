import type { SpecFile } from "./specParser.js";
import type { TestFileMap } from "./testMapper.js";

export interface TraceabilityIndexJSON {
  specs: SpecFile[];
  /** specPath → array of test file paths that reference it */
  mapping: Record<string, string[]>;
  /** testFilePath → specPath */
  reverseMapping: Record<string, string>;
}

export class TraceabilityIndex {
  private readonly specMap: Map<string, SpecFile>;
  private readonly specToTests: TestFileMap;
  private readonly testToSpec: Map<string, string>;

  constructor(specFiles: SpecFile[], testFileMap: TestFileMap) {
    this.specMap = new Map(specFiles.map(s => [s.filePath, s]));
    this.specToTests = testFileMap;
    this.testToSpec = new Map();
    for (const [specPath, testPaths] of testFileMap) {
      for (const testPath of testPaths) {
        this.testToSpec.set(testPath, specPath);
      }
    }
  }

  getLinkedTests(specPath: string): string[] {
    return this.specToTests.get(specPath) ?? [];
  }

  getLinkedSpec(testPath: string): SpecFile | undefined {
    const specPath = this.testToSpec.get(testPath);
    return specPath ? this.specMap.get(specPath) : undefined;
  }

  getSpecPath(testPath: string): string | undefined {
    return this.testToSpec.get(testPath);
  }

  get isEmpty(): boolean {
    return this.specMap.size === 0 && this.specToTests.size === 0;
  }

  toJSON(): TraceabilityIndexJSON {
    const mapping: Record<string, string[]> = {};
    for (const [specPath, testPaths] of this.specToTests) {
      mapping[specPath] = testPaths;
    }
    const reverseMapping: Record<string, string> = {};
    for (const [testPath, specPath] of this.testToSpec) {
      reverseMapping[testPath] = specPath;
    }
    return {
      specs: [...this.specMap.values()],
      mapping,
      reverseMapping,
    };
  }
}
