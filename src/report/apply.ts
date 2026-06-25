import type { ApplyResult } from "../commands/apply.js";

export function formatApply(result: ApplyResult, dryRun: boolean): string {
  const { files, totalTokensSaved, skipped } = result;
  const totalChanges = files.reduce((sum, f) => sum + f.patches.length, 0);
  const lines: string[] = [];

  lines.push(dryRun ? "Dietoken apply --dry-run" : "Dietoken apply");
  lines.push("");

  if (totalChanges === 0) {
    lines.push("  No automatic fixes available.");
    if (skipped.length > 0) {
      lines.push("");
      lines.push("  All findings require manual attention:");
      for (const f of skipped) {
        const loc = f.line ? `${f.file}:${f.line}` : f.file;
        lines.push(`  - ${f.code} ${loc}`);
        if (f.suggestion) lines.push(`    ${f.suggestion}`);
      }
    }
    return `${lines.join("\n")}\n`;
  }

  const verb = dryRun ? "Would apply" : "Applied";
  const fixes = totalChanges === 1 ? "fix" : "fixes";
  const fileCount = files.length === 1 ? "1 file" : `${files.length} files`;
  lines.push(`  ${verb} ${totalChanges} ${fixes} across ${fileCount}`);
  lines.push(`  Saved ~${totalTokensSaved} tokens`);
  lines.push("");
  lines.push("Changes");

  for (const file of files) {
    lines.push(`  ${file.relativePath}`);
    for (const patch of file.patches) {
      const tok = patch.tokensSaved > 0 ? `  -${patch.tokensSaved} tok` : "";
      lines.push(`    ✓ ${patch.label}${tok}`);
    }
  }

  if (skipped.length > 0) {
    lines.push("");
    lines.push("Skipped (need manual attention)");
    for (const f of skipped) {
      const loc = f.line ? `${f.file}:${f.line}` : f.file;
      lines.push(`  - ${f.code} ${loc}`);
      if (f.suggestion) lines.push(`    ${f.suggestion}`);
    }
  }

  if (dryRun) {
    lines.push("");
    lines.push("Run without --dry-run to apply changes.");
  }

  return `${lines.join("\n")}\n`;
}
