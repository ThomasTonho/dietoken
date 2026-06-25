import { mkdirSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { formatPlan } from "../report/markdown.js";
import type { ScanSummary } from "../types.js";

export function writePlan(cwd: string, summary: ScanSummary): string {
  const outDir = join(cwd, ".dietoken");
  const outPath = join(outDir, "plan.md");
  mkdirSync(outDir, { recursive: true });
  writeFileSync(outPath, formatPlan(summary), "utf8");
  return outPath;
}
