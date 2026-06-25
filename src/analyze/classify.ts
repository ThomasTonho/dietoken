import type { ContextFile, DietokenConfig, Finding } from "../types.js";

const vaguePatterns = [
  /\bbest practices?\b/i,
  /\bclean code\b/i,
  /\bproperly\b/i,
  /\brobust\b/i,
  /\bsimple\b/i,
  /\bgood\b/i,
  /\badequate\b/i,
  /\bmelhor(?:es)? pr[aá]tica/i,
  /\bc[oó]digo limpo\b/i,
  /\badequado\b/i,
  /\bbem feito\b/i
];

const workflowPatterns = [
  /\bstep\s+\d+/i,
  /\bpasso\s+\d+/i,
  /\bdeploy\b/i,
  /\brelease\b/i,
  /\bmigration\b/i,
  /\bmigra[cç][aã]o\b/i,
  /\bprocedure\b/i,
  /\bprocedimento\b/i,
  /^\s*\d+\.\s+/m
];

const pathPatterns = [
  /src\/\*\*/,
  /\*\.(tsx|ts|jsx|js|py|go|rs)\b/,
  /\btests?\//i,
  /\bapi\//i,
  /\bfrontend\b/i,
  /\bbackend\b/i
];

const hookPatterns = [
  /\bnever run\b/i,
  /\bdo not run\b/i,
  /\bn[aã]o rode\b/i,
  /\bnunca rode\b/i,
  /\bdo not read\b/i,
  /\bn[aã]o leia\b/i,
  /\bnode_modules\b/i,
  /\bdist\b/i,
  /\bcoverage\b/i,
  /\.next\b/i
];

export function analyzeFiles(files: ContextFile[], config: DietokenConfig): Finding[] {
  return [
    ...findLargeFiles(files, config),
    ...findLinePatterns(files),
    ...findDuplicates(files)
  ];
}

function findLargeFiles(files: ContextFile[], config: DietokenConfig): Finding[] {
  return files
    .filter((file) => file.alwaysOn && file.tokenEstimate >= config.largeFileWarningTokens)
    .map((file) => {
      const severity = file.tokenEstimate >= config.largeFileErrorTokens ? "error" : "warning";
      return {
        severity,
        code: "large-always-on-file",
        file: file.relativePath,
        message: `${file.relativePath} is always-on and has about ${file.tokenEstimate} tokens.`,
        suggestion: "Keep only rules needed in every session. Move long workflows to skills or scoped rules.",
        estimatedWasteTokens: Math.max(0, file.tokenEstimate - config.largeFileWarningTokens)
      } satisfies Finding;
    });
}

function findLinePatterns(files: ContextFile[]): Finding[] {
  const findings: Finding[] = [];

  for (const file of files) {
    const lines = file.content.split(/\r?\n/);

    lines.forEach((line, index) => {
      const lineNumber = index + 1;
      const trimmed = line.trim();
      if (!trimmed) {
        return;
      }

      if (vaguePatterns.some((pattern) => pattern.test(trimmed))) {
        findings.push({
          severity: "warning",
          code: "vague-rule",
          file: file.relativePath,
          line: lineNumber,
          message: "Instruction is vague and hard for agents to verify.",
          suggestion: "Replace vague quality words with observable rules, commands, or examples.",
          estimatedWasteTokens: estimateLineWaste(trimmed)
        });
      }

      if (file.alwaysOn && workflowPatterns.some((pattern) => pattern.test(trimmed))) {
        findings.push({
          severity: "warning",
          code: "workflow-in-always-on",
          file: file.relativePath,
          line: lineNumber,
          message: "Workflow-like instruction appears in always-on context.",
          suggestion: "Move repeatable procedures to a skill so they load only when needed.",
          estimatedWasteTokens: estimateLineWaste(trimmed)
        });
      }

      if (file.alwaysOn && pathPatterns.some((pattern) => pattern.test(trimmed))) {
        findings.push({
          severity: "info",
          code: "path-scoped-candidate",
          file: file.relativePath,
          line: lineNumber,
          message: "Instruction seems tied to specific paths or file types.",
          suggestion: "Move this guidance closer to that path or into path-scoped rules when supported.",
          estimatedWasteTokens: estimateLineWaste(trimmed)
        });
      }

      if (hookPatterns.some((pattern) => pattern.test(trimmed))) {
        findings.push({
          severity: "info",
          code: "hook-candidate",
          file: file.relativePath,
          line: lineNumber,
          message: "Instruction tries to prevent a mechanical action.",
          suggestion: "Use a hook or permission policy for enforcement instead of relying only on prose.",
          estimatedWasteTokens: estimateLineWaste(trimmed)
        });
      }
    });
  }

  return findings;
}

function findDuplicates(files: ContextFile[]): Finding[] {
  const seen = new Map<string, { file: string; line: number }>();
  const findings: Finding[] = [];

  for (const file of files) {
    const lines = file.content.split(/\r?\n/);
    lines.forEach((line, index) => {
      const normalized = normalizeLine(line);
      if (!normalized || normalized.length < 32) {
        return;
      }

      const first = seen.get(normalized);
      if (first && first.file !== file.relativePath) {
        findings.push({
          severity: "warning",
          code: "duplicate-guidance",
          file: file.relativePath,
          line: index + 1,
          message: `Duplicate guidance already appears in ${first.file}:${first.line}.`,
          suggestion: "Keep this rule in one place to reduce token cost and avoid drift.",
          estimatedWasteTokens: estimateLineWaste(line)
        });
      } else if (!first) {
        seen.set(normalized, { file: file.relativePath, line: index + 1 });
      }
    });
  }

  return findings;
}

function normalizeLine(line: string): string {
  return line
    .trim()
    .toLowerCase()
    .replace(/[^\p{L}\p{N}]+/gu, " ")
    .replace(/\s+/g, " ");
}

function estimateLineWaste(line: string): number {
  return Math.max(5, Math.ceil(line.length / 5));
}
