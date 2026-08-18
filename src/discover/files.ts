import { existsSync, readdirSync, readFileSync, statSync } from "node:fs";
import { homedir } from "node:os";
import { dirname, isAbsolute, join, relative, resolve } from "node:path";
import { estimateTokens } from "../analyze/tokenize.js";
import type { AgentKind, ContextFile, ContextKind, ContextScope } from "../types.js";

type FileSpec = {
  agent: AgentKind;
  path: string;
  scope: ContextScope;
  kind: ContextKind;
  alwaysOn: boolean;
};

type IgnoreMatcher = (path: string) => boolean;

const maxImportDepth = 3;

const skippedDirectories = new Set(["node_modules", ".git", "dist", "coverage"]);

export function readContextFile(spec: FileSpec, cwd: string, tokensPerUnit = 1): ContextFile | undefined {
  if (!existsSync(spec.path) || !statSync(spec.path).isFile()) {
    return undefined;
  }

  const content = readFileSync(spec.path, "utf8");
  return {
    ...spec,
    relativePath: spec.scope === "project" ? relative(cwd, spec.path) || "." : spec.path,
    content,
    tokenEstimate: estimateTokens(content, tokensPerUnit),
    residentTokens: residentCost(spec, content, tokensPerUnit)
  };
}

function residentCost(spec: FileSpec, content: string, tokensPerUnit: number): number {
  if (spec.kind === "config" || spec.kind === "hook") {
    return 0;
  }

  if (spec.alwaysOn) {
    return estimateTokens(content, tokensPerUnit);
  }

  const summary = frontMatterSummary(content);
  return summary === undefined ? 0 : estimateTokens(summary, tokensPerUnit);
}

function frontMatterSummary(content: string): string | undefined {
  const match = /^---\r?\n([\s\S]*?)\r?\n---/.exec(content);
  if (!match) {
    return undefined;
  }

  const name = field(match[1], "name");
  const description = field(match[1], "description");

  if (name === undefined && description === undefined) {
    return undefined;
  }

  return [name, description].filter(Boolean).join(": ");
}

function field(frontMatter: string, key: string): string | undefined {
  const match = new RegExp(`^${key}:\\s*(.+(?:\\r?\\n\\s{2,}.+)*)$`, "m").exec(frontMatter);
  if (!match) {
    return undefined;
  }

  return match[1].trim().replace(/^["']|["']$/g, "");
}

export function discoverFiles(
  cwd: string,
  includeUserFiles: boolean,
  ignore: string[] = [],
  tokensPerUnit = 1
): ContextFile[] {
  const isIgnored = createIgnoreMatcher(cwd, ignore);
  const specs: FileSpec[] = [
    ...codexProjectSpecs(cwd, isIgnored),
    ...claudeProjectSpecs(cwd, isIgnored)
  ];

  if (includeUserFiles) {
    specs.push(...codexUserSpecs(), ...claudeUserSpecs(isIgnored));
  }

  const files = specs
    .filter((spec) => !isIgnored(spec.path))
    .map((spec) => readContextFile(spec, cwd, tokensPerUnit))
    .filter((file): file is ContextFile => Boolean(file));

  return [...files, ...discoverImports(files, cwd, isIgnored, tokensPerUnit)];
}

function discoverImports(
  files: ContextFile[],
  cwd: string,
  isIgnored: IgnoreMatcher,
  tokensPerUnit: number
): ContextFile[] {
  const seen = new Set(files.map((file) => file.path));
  const imported: ContextFile[] = [];
  const queue = files.filter((file) => file.kind === "instructions").map((file) => ({ file, depth: 0 }));

  while (queue.length > 0) {
    const current = queue.shift();
    if (!current || current.depth >= maxImportDepth) {
      continue;
    }

    for (const target of importTargets(current.file.content)) {
      const path = resolveImport(current.file.path, target);
      if (seen.has(path) || isIgnored(path)) {
        continue;
      }
      seen.add(path);

      const file = readContextFile(
        {
          agent: current.file.agent,
          path,
          scope: current.file.scope,
          kind: "instructions",
          alwaysOn: current.file.alwaysOn
        },
        cwd,
        tokensPerUnit
      );

      if (file) {
        imported.push(file);
        queue.push({ file, depth: current.depth + 1 });
      }
    }
  }

  return imported;
}

function importTargets(content: string): string[] {
  const targets: string[] = [];
  let insideFence = false;

  for (const line of content.split(/\r?\n/)) {
    if (/^\s*(```|~~~)/.test(line)) {
      insideFence = !insideFence;
      continue;
    }

    if (insideFence) {
      continue;
    }

    const match = /^@(.+\.md)\s*$/.exec(line);
    if (match) {
      targets.push(match[1].trim());
    }
  }

  return targets;
}

function resolveImport(fromPath: string, target: string): string {
  if (target.startsWith("~/")) {
    return join(homedir(), target.slice(2));
  }

  return isAbsolute(target) ? target : resolve(dirname(fromPath), target);
}

function codexProjectSpecs(cwd: string, isIgnored: IgnoreMatcher): FileSpec[] {
  return [
    instruction("codex", join(cwd, "AGENTS.md"), "project"),
    instruction("codex", join(cwd, "AGENTS.override.md"), "project"),
    config("codex", join(cwd, ".codex", "config.toml"), "project"),
    hook("codex", join(cwd, ".codex", "hooks.json"), "project"),
    ...recursiveSpecs("codex", join(cwd, ".agents", "skills"), "SKILL.md", "project", "skill", false, isIgnored)
  ];
}

function claudeProjectSpecs(cwd: string, isIgnored: IgnoreMatcher): FileSpec[] {
  return [
    instruction("claude", join(cwd, "CLAUDE.md"), "project"),
    instruction("claude", join(cwd, "CLAUDE.local.md"), "project"),
    instruction("claude", join(cwd, ".claude", "CLAUDE.md"), "project"),
    config("claude", join(cwd, ".mcp.json"), "project"),
    config("claude", join(cwd, ".claude", "settings.json"), "project"),
    config("claude", join(cwd, ".claude", "settings.local.json"), "project"),
    ...recursiveSpecs("claude", join(cwd, ".claude", "rules"), ".md", "project", "rule", false, isIgnored),
    ...recursiveSpecs("claude", join(cwd, ".claude", "skills"), "SKILL.md", "project", "skill", false, isIgnored),
    ...recursiveSpecs("claude", join(cwd, ".claude", "agents"), ".md", "project", "agent", false, isIgnored),
    ...recursiveSpecs("claude", join(cwd, ".claude", "commands"), ".md", "project", "command", false, isIgnored)
  ];
}

function codexUserSpecs(): FileSpec[] {
  const root = join(homedir(), ".codex");
  return [
    instruction("codex", join(root, "AGENTS.md"), "user"),
    instruction("codex", join(root, "AGENTS.override.md"), "user"),
    config("codex", join(root, "config.toml"), "user"),
    hook("codex", join(root, "hooks.json"), "user")
  ];
}

function claudeUserSpecs(isIgnored: IgnoreMatcher): FileSpec[] {
  const root = join(homedir(), ".claude");
  return [
    instruction("claude", join(root, "CLAUDE.md"), "user"),
    config("claude", join(root, "settings.json"), "user"),
    ...recursiveSpecs("claude", join(root, "rules"), ".md", "user", "rule", false, isIgnored),
    ...recursiveSpecs("claude", join(root, "skills"), "SKILL.md", "user", "skill", false, isIgnored),
    ...recursiveSpecs("claude", join(root, "agents"), ".md", "user", "agent", false, isIgnored),
    ...recursiveSpecs("claude", join(root, "commands"), ".md", "user", "command", false, isIgnored),
    ...recursiveSpecs("claude", join(root, "plugins"), "SKILL.md", "user", "skill", false, isIgnored),
    config("claude", join(homedir(), ".claude.json"), "user")
  ];
}

function instruction(agent: AgentKind, path: string, scope: ContextScope): FileSpec {
  return { agent, path, scope, kind: "instructions", alwaysOn: true };
}

function config(agent: AgentKind, path: string, scope: ContextScope): FileSpec {
  return { agent, path, scope, kind: "config", alwaysOn: false };
}

function hook(agent: AgentKind, path: string, scope: ContextScope): FileSpec {
  return { agent, path, scope, kind: "hook", alwaysOn: false };
}

function recursiveSpecs(
  agent: AgentKind,
  root: string,
  suffix: string,
  scope: ContextScope,
  kind: ContextKind,
  alwaysOn: boolean,
  isIgnored: IgnoreMatcher
): FileSpec[] {
  if (isIgnored(root) || !existsSync(root) || !statSync(root).isDirectory()) {
    return [];
  }

  const specs: FileSpec[] = [];
  const entries = readdirSync(root, { withFileTypes: true });

  for (const entry of entries) {
    const path = join(root, entry.name);
    if (isIgnored(path)) {
      continue;
    }

    if (entry.isDirectory()) {
      if (skippedDirectories.has(entry.name)) {
        continue;
      }

      specs.push(...recursiveSpecs(agent, path, suffix, scope, kind, alwaysOn, isIgnored));
    } else if (entry.isFile() && entry.name.endsWith(suffix)) {
      specs.push({ agent, path, scope, kind, alwaysOn });
    }
  }

  return specs;
}

function createIgnoreMatcher(cwd: string, patterns: string[]): IgnoreMatcher {
  const normalizedPatterns = patterns.map(normalizePath).filter(Boolean);

  return (path: string) => {
    const relativePath = normalizePath(relative(cwd, path));
    const normalizedPath = normalizePath(path);
    return normalizedPatterns.some(
      (pattern) => matchesIgnorePattern(relativePath, pattern) || matchesIgnorePattern(normalizedPath, pattern)
    );
  };
}

function matchesIgnorePattern(path: string, pattern: string): boolean {
  if (pattern.endsWith("/**")) {
    const base = pattern.slice(0, -3);
    return path === base || path.startsWith(`${base}/`);
  }

  const regex = new RegExp(`^${globToRegExp(pattern)}$`);
  return regex.test(path);
}

function globToRegExp(pattern: string): string {
  return pattern
    .replace(/[.+^${}()|[\]\\]/g, "\\$&")
    .replace(/\*\*/g, "\0")
    .replace(/\*/g, "[^/]*")
    .replace(/\0/g, ".*");
}

function normalizePath(path: string): string {
  return path.replace(/\\/g, "/").replace(/\/+$/g, "");
}
