import type { Finding, ScanSummary } from "../types.js";

export function formatScan(summary: ScanSummary): string {
  const lines: string[] = [];

  lines.push("Dietoken scan");
  lines.push("");
  lines.push(`Files analyzed: ${summary.files.length}`);
  lines.push(`Total context estimate: ${summary.totalTokens} tokens`);
  lines.push(`Always-on estimate: ${summary.alwaysOnTokens} tokens`);
  lines.push(`Estimated waste: ${summary.estimatedWasteTokens} tokens`);
  lines.push("");

  if (summary.files.length > 0) {
    lines.push("Context files");
    for (const file of [...summary.files].sort((a, b) => b.tokenEstimate - a.tokenEstimate)) {
      const always = file.alwaysOn ? "always-on" : "on-demand";
      lines.push(`- ${file.relativePath} ${file.tokenEstimate} tokens ${file.agent}/${file.kind}/${always}`);
    }
    lines.push("");
  }

  if (summary.findings.length > 0) {
    lines.push("Findings");
    for (const finding of sortFindings(summary.findings)) {
      const location = finding.line ? `${finding.file}:${finding.line}` : finding.file;
      lines.push(`- ${finding.severity} ${finding.code} ${location}`);
      lines.push(`  ${finding.message}`);
      if (finding.suggestion) {
        lines.push(`  Suggestion: ${finding.suggestion}`);
      }
    }
  } else {
    lines.push("Findings");
    lines.push("- No token waste patterns found.");
  }

  return `${lines.join("\n")}\n`;
}

function sortFindings(findings: Finding[]): Finding[] {
  const severityRank = { error: 0, warning: 1, info: 2 };
  return [...findings].sort((a, b) => {
    const severity = severityRank[a.severity] - severityRank[b.severity];
    if (severity !== 0) {
      return severity;
    }
    return a.file.localeCompare(b.file) || (a.line ?? 0) - (b.line ?? 0);
  });
}
