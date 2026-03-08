import type { GlossyReporterConfig } from "../types/index.js";

export const defaultConfig: Required<Pick<GlossyReporterConfig, "outputDir" | "reportTitle" | "includeScreenshots" | "includeTraces" | "includeVideos" | "theme">> = {
  outputDir: "spec-doc-report",
  reportTitle: "Playwright Spec Doc Report",
  includeScreenshots: true,
  includeTraces: true,
  includeVideos: true,
  theme: "dark-glossy"
};
