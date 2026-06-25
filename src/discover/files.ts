import { existsSync, readdirSync, readFileSync, statSync } from "node:fs";
import { homedir } from "node:os";
import { join, relative } from "node:path";
import { estimateTokens } from "../analyze/tokenize.js";
import type { AgentKind, ContextFile, ContextKind, ContextScope } from "../types.js";

type FileSpec = {
  agent: AgentKind;
  path: string;
  scope: ContextScope;
  kind: ContextKind;
  alwaysOn: boolean;
};

export function readContextFile(spec: FileSpec, cwd: string): ContextFile | undefined {
  if (!existsSync(spec.path) || !statSync(spec.path).isFile()) {
    return undefined;
  }

  const content = readFileSync(spec.path, "utf8");
  return {
    ...spec,
    relativePath: spec.scope === "project" ? relative(cwd, spec.path) || "." : spec.path,
    content,
    tokenEstimate: estimateTokens(content)
  };
}

export function discoverFiles(cwd: string, includeUserFiles: boolean): ContextFile[] {
  const specs: FileSpec[] = [
    ...codexProjectSpecs(cwd),
    ...claudeProjectSpecs(cwd)
  ];

  if (includeUserFiles) {
    specs.push(...codexUserSpecs(), ...claudeUserSpecs());
  }

  return specs
    .map((spec) => readContextFile(spec, cwd))
    .filter((file): file is ContextFile => Boolean(file));
}

function codexProjectSpecs(cwd: string): FileSpec[] {
  return [
    instruction("codex", join(cwd, "AGENTS.md"), "project"),
    instruction("codex", join(cwd, "AGENTS.override.md"), "project"),
    config("codex", join(cwd, ".codex", "config.toml"), "project"),
    hook("codex", join(cwd, ".codex", "hooks.json"), "project"),
    ...recursiveSpecs("codex", join(cwd, ".agents", "skills"), "SKILL.md", "project", "skill", false)
  ];
}

function claudeProjectSpecs(cwd: string): FileSpec[] {
  return [
    instruction("claude", join(cwd, "CLAUDE.md"), "project"),
    instruction("claude", join(cwd, "CLAUDE.local.md"), "project"),
    instruction("claude", join(cwd, ".claude", "CLAUDE.md"), "project"),
    config("claude", join(cwd, ".claude", "settings.json"), "project"),
    config("claude", join(cwd, ".claude", "settings.local.json"), "project"),
    ...recursiveSpecs("claude", join(cwd, ".claude", "rules"), ".md", "project", "rule", false),
    ...recursiveSpecs("claude", join(cwd, ".claude", "skills"), "SKILL.md", "project", "skill", false)
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

function claudeUserSpecs(): FileSpec[] {
  const root = join(homedir(), ".claude");
  return [
    instruction("claude", join(root, "CLAUDE.md"), "user"),
    config("claude", join(root, "settings.json"), "user"),
    ...recursiveSpecs("claude", join(root, "rules"), ".md", "user", "rule", false)
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
  alwaysOn: boolean
): FileSpec[] {
  if (!existsSync(root) || !statSync(root).isDirectory()) {
    return [];
  }

  const specs: FileSpec[] = [];
  const entries = readdirSync(root, { withFileTypes: true });

  for (const entry of entries) {
    const path = join(root, entry.name);
    if (entry.isDirectory()) {
      specs.push(...recursiveSpecs(agent, path, suffix, scope, kind, alwaysOn));
    } else if (entry.isFile() && entry.name.endsWith(suffix)) {
      specs.push({ agent, path, scope, kind, alwaysOn });
    }
  }

  return specs;
}
