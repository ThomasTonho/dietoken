import { discoverFiles } from "../discover/files.js";
import { analyzeFiles } from "../analyze/classify.js";
import type { DietokenConfig, ScanOptions, ScanSummary } from "../types.js";

export function scanProject(options: ScanOptions, config: DietokenConfig): ScanSummary {
  const files = discoverFiles(options.cwd, options.includeUserFiles || config.includeUserFiles);
  const findings = analyzeFiles(files, config);
  const totalTokens = files.reduce((sum, file) => sum + file.tokenEstimate, 0);
  const alwaysOnTokens = files
    .filter((file) => file.alwaysOn)
    .reduce((sum, file) => sum + file.tokenEstimate, 0);
  const estimatedWasteTokens = findings.reduce((sum, finding) => sum + (finding.estimatedWasteTokens ?? 0), 0);

  return {
    files,
    findings,
    totalTokens,
    alwaysOnTokens,
    estimatedWasteTokens
  };
}
