import { mkdirSync, writeFileSync } from "node:fs";
import { dirname } from "node:path";
import { applyPatches, buildPatches, canFix, type Patch } from "../apply/patches.js";
import { scanProject } from "./scan.js";
import type { DietokenConfig, Finding, ScanOptions } from "../types.js";

export type ApplyFileResult = {
  relativePath: string;
  patches: Patch[];
  tokensSaved: number;
};

export type ApplyResult = {
  files: ApplyFileResult[];
  totalTokensSaved: number;
  skipped: Finding[];
};

export function applyFixes(
  options: ScanOptions,
  config: DietokenConfig,
  dryRun: boolean
): ApplyResult {
  const summary = scanProject(options, config);

  const fixableByFile = new Map<string, Finding[]>();
  const skipped: Finding[] = [];

  for (const finding of summary.findings) {
    if (canFix(finding)) {
      const list = fixableByFile.get(finding.file) ?? [];
      list.push(finding);
      fixableByFile.set(finding.file, list);
    } else {
      skipped.push(finding);
    }
  }

  const files: ApplyFileResult[] = [];

  for (const [relativePath, findings] of fixableByFile) {
    const contextFile = summary.files.find((f) => f.relativePath === relativePath);
    if (!contextFile) continue;

    const patches = buildPatches(contextFile, findings, options.cwd);
    if (patches.length === 0) continue;

    if (!dryRun) {
      const { newContent, skills } = applyPatches(contextFile.content, patches);
      writeFileSync(contextFile.path, newContent, "utf8");
      for (const skill of skills) {
        mkdirSync(dirname(skill.path), { recursive: true });
        writeFileSync(skill.path, skill.content, "utf8");
      }
    }

    files.push({
      relativePath,
      patches,
      tokensSaved: patches.reduce((sum, p) => sum + p.tokensSaved, 0)
    });
  }

  return {
    files,
    totalTokensSaved: files.reduce((sum, f) => sum + f.tokensSaved, 0),
    skipped
  };
}
