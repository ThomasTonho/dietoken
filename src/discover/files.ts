import { existsSync, readdirSync, readFileSync, statSync } from "node:fs";
import { homedir } from "node:os";
import { dirname, join, relative } from "node:path";
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

function resolveIncludes(content: string, filePath: string, depth: number): string {
  if (depth <= 0) return content;

  return content.replace(/^@(.+\.md)\s*$/gm, (_match, includeName: string) => {
    const includePath = join(dirname(filePath), includeName.trim());
    if (!existsSync(includePath) || !statSync(includePath).isFile()) {
      return _match;
    }
    const includeContent = readFileSync(includePath, "utf8");
    return resolveIncludes(includeContent, includePath, depth - 1);
  });
}

export function readContextFile(spec: FileSpec, cwd: string): ContextFile | undefined {
  if (!existsSync(spec.path) || !statSync(spec.path).isFile()) {
    return undefined;
  }

  const raw = readFileSync(spec.path, "utf8");
  const content = resolveIncludes(raw, spec.path, 3);
  return {
    ...spec,
    relativePath: spec.scope === "project" ? relative(cwd, spec.path) || "." : spec.path,
    content,
    tokenEstimate: estimateTokens(content)
  };
}

export function discoverFiles(cwd: string, includeUserFiles: boolean, ignore: string[] = []): ContextFile[] {
  const isIgnored = createIgnoreMatcher(cwd, ignore);
  const specs: FileSpec[] = [
    ...codexProjectSpecs(cwd, isIgnored),
    ...claudeProjectSpecs(cwd, isIgnored)
  ];

  if (includeUserFiles) {
    specs.push(...codexUserSpecs(), ...claudeUserSpecs(isIgnored));
  }

  return specs
    .filter((spec) => !isIgnored(spec.path))
    .map((spec) => readContextFile(spec, cwd))
    .filter((file): file is ContextFile => Boolean(file));
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
    config("claude", join(cwd, ".claude", "settings.json"), "project"),
    config("claude", join(cwd, ".claude", "settings.local.json"), "project"),
    ...recursiveSpecs("claude", join(cwd, ".claude", "rules"), ".md", "project", "rule", false, isIgnored),
    ...recursiveSpecs("claude", join(cwd, ".claude", "skills"), "SKILL.md", "project", "skill", false, isIgnored)
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
    ...recursiveSpecs("claude", join(root, "rules"), ".md", "user", "rule", false, isIgnored)
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
