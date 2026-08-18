import { discoverFiles } from "../discover/files.js";
import { analyzeFiles } from "../analyze/classify.js";
import type { DietokenConfig, Finding, ScanOptions, ScanSummary } from "../types.js";

export function scanProject(options: ScanOptions, config: DietokenConfig): ScanSummary {
  const files = discoverFiles(options.cwd, options.includeUserFiles || config.includeUserFiles, config.ignore);
  const findings = analyzeFiles(files, config);
  const totalTokens = files.reduce((sum, file) => sum + file.tokenEstimate, 0);
  const alwaysOnTokens = files
    .filter((file) => file.alwaysOn)
    .reduce((sum, file) => sum + file.tokenEstimate, 0);
  const estimatedWasteTokens = Math.min(totalTokens, sumWaste(findings));

  return {
    files,
    findings,
    totalTokens,
    alwaysOnTokens,
    estimatedWasteTokens
  };
}

function sumWaste(findings: Finding[]): number {
  const worstPerLine = new Map<string, number>();
  let total = 0;

  for (const finding of findings) {
    const waste = finding.estimatedWasteTokens ?? 0;
    if (waste === 0) {
      continue;
    }

    if (finding.line === undefined) {
      total += waste;
      continue;
    }

    const key = `${finding.file}:${finding.line}`;
    worstPerLine.set(key, Math.max(worstPerLine.get(key) ?? 0, waste));
  }

  for (const waste of worstPerLine.values()) {
    total += waste;
  }

  return total;
}
