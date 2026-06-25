import type { Finding, ScanSummary } from "../types.js";

export function formatPlan(summary: ScanSummary): string {
  const byCode = groupByCode(summary.findings);
  const lines: string[] = [];

  lines.push("# Dietoken Plan");
  lines.push("");
  lines.push("## Summary");
  lines.push("");
  lines.push(`- Files analyzed: ${summary.files.length}`);
  lines.push(`- Total context estimate: ${summary.totalTokens} tokens`);
  lines.push(`- Always-on estimate: ${summary.alwaysOnTokens} tokens`);
  lines.push(`- Estimated waste: ${summary.estimatedWasteTokens} tokens`);
  lines.push("");
  lines.push("## Recommended Actions");
  lines.push("");

  appendSection(lines, byCode.get("large-always-on-file"), "Shrink always-on instruction files");
  appendSection(lines, byCode.get("workflow-in-always-on"), "Move long workflows to skills");
  appendSection(lines, byCode.get("path-scoped-candidate"), "Move path-specific guidance closer to matching files");
  appendSection(lines, byCode.get("hook-candidate"), "Enforce mechanical rules with hooks");
  appendSection(lines, byCode.get("vague-rule"), "Replace vague rules with observable rules");
  appendSection(lines, byCode.get("duplicate-guidance"), "Remove duplicated guidance");

  if (summary.findings.length === 0) {
    lines.push("No major context waste found.");
    lines.push("");
  }

  lines.push("## Context Files");
  lines.push("");
  for (const file of [...summary.files].sort((a, b) => b.tokenEstimate - a.tokenEstimate)) {
    lines.push(`- \`${file.relativePath}\`: ${file.tokenEstimate} tokens, ${file.agent}/${file.kind}`);
  }
  lines.push("");

  return `${lines.join("\n")}\n`;
}

function groupByCode(findings: Finding[]): Map<string, Finding[]> {
  const map = new Map<string, Finding[]>();
  for (const finding of findings) {
    const current = map.get(finding.code) ?? [];
    current.push(finding);
    map.set(finding.code, current);
  }
  return map;
}

function appendSection(lines: string[], findings: Finding[] | undefined, title: string): void {
  if (!findings || findings.length === 0) {
    return;
  }

  lines.push(`### ${title}`);
  lines.push("");
  for (const finding of findings) {
    const location = finding.line ? `${finding.file}:${finding.line}` : finding.file;
    lines.push(`- \`${location}\`: ${finding.message}`);
    if (finding.suggestion) {
      lines.push(`  - Suggestion: ${finding.suggestion}`);
    }
  }
  lines.push("");
}
