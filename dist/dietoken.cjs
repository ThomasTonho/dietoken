#!/usr/bin/env node
"use strict";

// src/cli.ts
var import_node_path4 = require("node:path");

// src/config.ts
var import_node_fs = require("node:fs");
var import_node_path = require("node:path");
var defaultConfig = {
  largeFileWarningTokens: 1500,
  largeFileErrorTokens: 4e3,
  includeUserFiles: false,
  ignore: ["node_modules/**", "dist/**", "coverage/**", ".next/**", ".git/**"]
};
function loadConfig(cwd) {
  const path = (0, import_node_path.join)(cwd, ".dietokenrc.json");
  if (!(0, import_node_fs.existsSync)(path)) {
    return { ...defaultConfig };
  }
  const raw = (0, import_node_fs.readFileSync)(path, "utf8");
  const parsed = JSON.parse(raw);
  return {
    ...defaultConfig,
    ...parsed,
    ignore: parsed.ignore ?? defaultConfig.ignore
  };
}

// src/discover/files.ts
var import_node_fs2 = require("node:fs");
var import_node_os = require("node:os");
var import_node_path2 = require("node:path");

// src/analyze/tokenize.ts
function estimateTokens(input) {
  const normalized = input.trim();
  if (!normalized) {
    return 0;
  }
  const units = normalized.match(/[\p{L}\p{N}_]+|[^\s\p{L}\p{N}_]/gu);
  if (!units) {
    return 0;
  }
  return units.length;
}

// src/discover/files.ts
function readContextFile(spec, cwd) {
  if (!(0, import_node_fs2.existsSync)(spec.path) || !(0, import_node_fs2.statSync)(spec.path).isFile()) {
    return void 0;
  }
  const content = (0, import_node_fs2.readFileSync)(spec.path, "utf8");
  return {
    ...spec,
    relativePath: spec.scope === "project" ? (0, import_node_path2.relative)(cwd, spec.path) || "." : spec.path,
    content,
    tokenEstimate: estimateTokens(content)
  };
}
function discoverFiles(cwd, includeUserFiles, ignore = []) {
  const isIgnored = createIgnoreMatcher(cwd, ignore);
  const specs = [
    ...codexProjectSpecs(cwd, isIgnored),
    ...claudeProjectSpecs(cwd, isIgnored)
  ];
  if (includeUserFiles) {
    specs.push(...codexUserSpecs(), ...claudeUserSpecs(isIgnored));
  }
  return specs.filter((spec) => !isIgnored(spec.path)).map((spec) => readContextFile(spec, cwd)).filter((file) => Boolean(file));
}
function codexProjectSpecs(cwd, isIgnored) {
  return [
    instruction("codex", (0, import_node_path2.join)(cwd, "AGENTS.md"), "project"),
    instruction("codex", (0, import_node_path2.join)(cwd, "AGENTS.override.md"), "project"),
    config("codex", (0, import_node_path2.join)(cwd, ".codex", "config.toml"), "project"),
    hook("codex", (0, import_node_path2.join)(cwd, ".codex", "hooks.json"), "project"),
    ...recursiveSpecs("codex", (0, import_node_path2.join)(cwd, ".agents", "skills"), "SKILL.md", "project", "skill", false, isIgnored)
  ];
}
function claudeProjectSpecs(cwd, isIgnored) {
  return [
    instruction("claude", (0, import_node_path2.join)(cwd, "CLAUDE.md"), "project"),
    instruction("claude", (0, import_node_path2.join)(cwd, "CLAUDE.local.md"), "project"),
    instruction("claude", (0, import_node_path2.join)(cwd, ".claude", "CLAUDE.md"), "project"),
    config("claude", (0, import_node_path2.join)(cwd, ".claude", "settings.json"), "project"),
    config("claude", (0, import_node_path2.join)(cwd, ".claude", "settings.local.json"), "project"),
    ...recursiveSpecs("claude", (0, import_node_path2.join)(cwd, ".claude", "rules"), ".md", "project", "rule", false, isIgnored),
    ...recursiveSpecs("claude", (0, import_node_path2.join)(cwd, ".claude", "skills"), "SKILL.md", "project", "skill", false, isIgnored)
  ];
}
function codexUserSpecs() {
  const root = (0, import_node_path2.join)((0, import_node_os.homedir)(), ".codex");
  return [
    instruction("codex", (0, import_node_path2.join)(root, "AGENTS.md"), "user"),
    instruction("codex", (0, import_node_path2.join)(root, "AGENTS.override.md"), "user"),
    config("codex", (0, import_node_path2.join)(root, "config.toml"), "user"),
    hook("codex", (0, import_node_path2.join)(root, "hooks.json"), "user")
  ];
}
function claudeUserSpecs(isIgnored) {
  const root = (0, import_node_path2.join)((0, import_node_os.homedir)(), ".claude");
  return [
    instruction("claude", (0, import_node_path2.join)(root, "CLAUDE.md"), "user"),
    config("claude", (0, import_node_path2.join)(root, "settings.json"), "user"),
    ...recursiveSpecs("claude", (0, import_node_path2.join)(root, "rules"), ".md", "user", "rule", false, isIgnored)
  ];
}
function instruction(agent, path, scope) {
  return { agent, path, scope, kind: "instructions", alwaysOn: true };
}
function config(agent, path, scope) {
  return { agent, path, scope, kind: "config", alwaysOn: false };
}
function hook(agent, path, scope) {
  return { agent, path, scope, kind: "hook", alwaysOn: false };
}
function recursiveSpecs(agent, root, suffix, scope, kind, alwaysOn, isIgnored) {
  if (isIgnored(root) || !(0, import_node_fs2.existsSync)(root) || !(0, import_node_fs2.statSync)(root).isDirectory()) {
    return [];
  }
  const specs = [];
  const entries = (0, import_node_fs2.readdirSync)(root, { withFileTypes: true });
  for (const entry of entries) {
    const path = (0, import_node_path2.join)(root, entry.name);
    if (isIgnored(path)) {
      continue;
    }
    if (entry.isDirectory()) {
      specs.push(...recursiveSpecs(agent, path, suffix, scope, kind, alwaysOn, isIgnored));
    } else if (entry.isFile() && entry.name.endsWith(suffix)) {
      specs.push({ agent, path, scope, kind, alwaysOn });
    }
  }
  return specs;
}
function createIgnoreMatcher(cwd, patterns) {
  const normalizedPatterns = patterns.map(normalizePath).filter(Boolean);
  return (path) => {
    const relativePath = normalizePath((0, import_node_path2.relative)(cwd, path));
    const normalizedPath = normalizePath(path);
    return normalizedPatterns.some(
      (pattern) => matchesIgnorePattern(relativePath, pattern) || matchesIgnorePattern(normalizedPath, pattern)
    );
  };
}
function matchesIgnorePattern(path, pattern) {
  if (pattern.endsWith("/**")) {
    const base2 = pattern.slice(0, -3);
    return path === base2 || path.startsWith(`${base2}/`);
  }
  const regex = new RegExp(`^${globToRegExp(pattern)}$`);
  return regex.test(path);
}
function globToRegExp(pattern) {
  return pattern.replace(/[.+^${}()|[\]\\]/g, "\\$&").replace(/\*\*/g, "\0").replace(/\*/g, "[^/]*").replace(/\0/g, ".*");
}
function normalizePath(path) {
  return path.replace(/\\/g, "/").replace(/\/+$/g, "");
}

// src/analyze/classify.ts
var vaguePatterns = [
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
var workflowPatterns = [
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
var pathPatterns = [
  /src\/\*\*/,
  /\*\.(tsx|ts|jsx|js|py|go|rs)\b/,
  /\btests?\//i,
  /\bapi\//i,
  /\bfrontend\b/i,
  /\bbackend\b/i
];
var hookPatterns = [
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
function analyzeFiles(files, config2) {
  return [
    ...findLargeFiles(files, config2),
    ...findLinePatterns(files),
    ...findDuplicates(files)
  ];
}
function findLargeFiles(files, config2) {
  return files.filter((file) => file.alwaysOn && file.tokenEstimate >= config2.largeFileWarningTokens).map((file) => {
    const severity = file.tokenEstimate >= config2.largeFileErrorTokens ? "error" : "warning";
    return {
      severity,
      code: "large-always-on-file",
      file: file.relativePath,
      message: `${file.relativePath} is always-on and has about ${file.tokenEstimate} tokens.`,
      suggestion: "Keep only rules needed in every session. Move long workflows to skills or scoped rules.",
      estimatedWasteTokens: Math.max(0, file.tokenEstimate - config2.largeFileWarningTokens)
    };
  });
}
function findLinePatterns(files) {
  const findings = [];
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
function findDuplicates(files) {
  const seen = /* @__PURE__ */ new Map();
  const findings = [];
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
function normalizeLine(line) {
  return line.trim().toLowerCase().replace(/[^\p{L}\p{N}]+/gu, " ").replace(/\s+/g, " ");
}
function estimateLineWaste(line) {
  return Math.max(5, Math.ceil(line.length / 5));
}

// src/commands/scan.ts
function scanProject(options, config2) {
  const files = discoverFiles(options.cwd, options.includeUserFiles || config2.includeUserFiles, config2.ignore);
  const findings = analyzeFiles(files, config2);
  const totalTokens = files.reduce((sum, file) => sum + file.tokenEstimate, 0);
  const alwaysOnTokens = files.filter((file) => file.alwaysOn).reduce((sum, file) => sum + file.tokenEstimate, 0);
  const estimatedWasteTokens = findings.reduce((sum, finding) => sum + (finding.estimatedWasteTokens ?? 0), 0);
  return {
    files,
    findings,
    totalTokens,
    alwaysOnTokens,
    estimatedWasteTokens
  };
}

// src/commands/plan.ts
var import_node_fs3 = require("node:fs");
var import_node_path3 = require("node:path");

// src/report/markdown.ts
function formatPlan(summary) {
  const byCode = groupByCode(summary.findings);
  const lines = [];
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
  return `${lines.join("\n")}
`;
}
function groupByCode(findings) {
  const map = /* @__PURE__ */ new Map();
  for (const finding of findings) {
    const current = map.get(finding.code) ?? [];
    current.push(finding);
    map.set(finding.code, current);
  }
  return map;
}
function appendSection(lines, findings, title) {
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

// src/commands/plan.ts
function writePlan(cwd, summary) {
  const outDir = (0, import_node_path3.join)(cwd, ".dietoken");
  const outPath = (0, import_node_path3.join)(outDir, "plan.md");
  (0, import_node_fs3.mkdirSync)(outDir, { recursive: true });
  (0, import_node_fs3.writeFileSync)(outPath, formatPlan(summary), "utf8");
  return outPath;
}

// src/report/console.ts
function formatScan(summary) {
  const lines = [];
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
  return `${lines.join("\n")}
`;
}
function sortFindings(findings) {
  const severityRank = { error: 0, warning: 1, info: 2 };
  return [...findings].sort((a, b) => {
    const severity = severityRank[a.severity] - severityRank[b.severity];
    if (severity !== 0) {
      return severity;
    }
    return a.file.localeCompare(b.file) || (a.line ?? 0) - (b.line ?? 0);
  });
}

// src/cli.ts
var version = "0.1.0";
main();
function main() {
  try {
    const args = parseArgs(process.argv.slice(2));
    if (args.command === "help") {
      process.stdout.write(helpText());
      return;
    }
    if (args.command === "version") {
      process.stdout.write(`${version}
`);
      return;
    }
    const config2 = loadConfig(args.cwd);
    const summary = scanProject(
      {
        cwd: args.cwd,
        includeUserFiles: args.includeUserFiles
      },
      config2
    );
    if (args.command === "scan") {
      if (args.json) {
        process.stdout.write(`${JSON.stringify(summary, null, 2)}
`);
      } else {
        process.stdout.write(formatScan(summary));
      }
      return;
    }
    const outPath = writePlan(args.cwd, summary);
    if (args.json) {
      process.stdout.write(`${JSON.stringify({ path: outPath, summary }, null, 2)}
`);
    } else {
      process.stdout.write(`Wrote ${outPath}
`);
    }
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    process.stderr.write(`dietoken: ${message}
`);
    process.exitCode = 1;
  }
}
function parseArgs(argv) {
  const [first, ...rest] = argv;
  if (first === "--help" || first === "-h") {
    return base("help");
  }
  if (first === "--version" || first === "-v") {
    return base("version");
  }
  const command = first && !first.startsWith("-") ? first : "scan";
  const flags = first && first.startsWith("-") ? argv : rest;
  if (command === "help") {
    return base("help");
  }
  if (command === "version") {
    return base("version");
  }
  if (command !== "scan" && command !== "plan") {
    throw new Error(`unknown command "${command}"`);
  }
  let cwd = process.cwd();
  let json = false;
  let includeUserFiles = false;
  for (let index = 0; index < flags.length; index += 1) {
    const flag = flags[index];
    if (flag === "--json") {
      json = true;
    } else if (flag === "--include-user") {
      includeUserFiles = true;
    } else if (flag === "--cwd") {
      const value = flags[index + 1];
      if (!value) {
        throw new Error("--cwd requires a path");
      }
      cwd = (0, import_node_path4.resolve)(value);
      index += 1;
    } else {
      throw new Error(`unknown option "${flag}"`);
    }
  }
  return {
    command,
    cwd,
    json,
    includeUserFiles
  };
}
function base(command) {
  return {
    command,
    cwd: process.cwd(),
    json: false,
    includeUserFiles: false
  };
}
function helpText() {
  return `Dietoken

Kill wasted tokens. Keep better context.

Usage:
  dietoken scan [--json] [--include-user] [--cwd <path>]
  dietoken plan [--json] [--include-user] [--cwd <path>]

Commands:
  scan     Analyze Codex and Claude Code context files
  plan     Write .dietoken/plan.md with optimization suggestions

Options:
  --json          Print JSON
  --include-user  Include user-level ~/.codex and ~/.claude files
  --cwd <path>    Analyze another directory
  -h, --help      Show help
  -v, --version   Show version
`;
}
