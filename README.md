# Dietoken

Audit AI agent context and cut wasted tokens.

[![CI](https://github.com/ThomasTonho/dietoken/actions/workflows/ci.yml/badge.svg)](https://github.com/ThomasTonho/dietoken/actions/workflows/ci.yml)
[![License: MIT](https://img.shields.io/badge/license-MIT-blue.svg)](LICENSE)
[![Node.js](https://img.shields.io/badge/node-%3E%3D18-green.svg)](https://nodejs.org)

Dietoken is a CLI for projects using code agents like Codex and Claude Code. It analyzes instruction files, skills, rules, hooks, and configs to find always-on context that's too large, duplicate instructions, vague rules, and workflows that should live in skills or scoped rules.

## Why it exists

Code agents work best with short, clear, and relevant context. Files like `AGENTS.md`, `CLAUDE.md`, rules, and skills tend to become a dumping ground for conventions, workflows, warnings, and outdated preferences.

This creates two problems:

- tokens are spent before the real task even starts;
- important instructions compete with vague, duplicated, or stale rules.

Dietoken surfaces that cost and helps you clean up.

## Install

```sh
curl -fsSL https://raw.githubusercontent.com/ThomasTonho/dietoken/main/install.sh | sh
```

Or with npm:

```sh
npm install -g dietoken
```

Or run without installing:

```sh
npx dietoken scan
```

## Quick start

Analyze the current project:

```sh
dietoken scan
```

Print JSON:

```sh
dietoken scan --json
```

Generate an optimization plan:

```sh
dietoken plan
```

Analyze another directory:

```sh
dietoken scan --cwd ../my-project
```

Include global files from `~/.codex` and `~/.claude`:

```sh
dietoken scan --include-user
```

## What Dietoken analyzes

**Codex:**

- `AGENTS.md`
- `AGENTS.override.md`
- `.agents/skills/**/SKILL.md`
- `.codex/hooks.json`
- `.codex/config.toml`
- optional files in `~/.codex/*`

**Claude Code:**

- `CLAUDE.md`
- `CLAUDE.local.md`
- `.claude/CLAUDE.md`
- `.claude/rules/**/*.md`
- `.claude/skills/**/SKILL.md`
- `.claude/settings.json`
- optional files in `~/.claude/*`

## Findings

Dietoken reports:

- large always-on files;
- vague rules like "use best practices" or "write clean code";
- long workflows that should become skills;
- path-specific instructions that should live closer to the right files;
- prose rules that should be hooks or permission policies;
- duplicate instructions across files.

## Example

```txt
dietoken scan

Files analyzed: 2
Total context estimate: 4210 tokens
Always-on estimate: 3820 tokens
Estimated waste: 1340 tokens

Findings
- warning large-always-on-file CLAUDE.md
  CLAUDE.md is always-on and has about 2880 tokens.
  Suggestion: Keep only rules needed in every session. Move long workflows to skills or scoped rules.
- warning workflow-in-always-on AGENTS.md:42
  Workflow-like instruction appears in always-on context.
  Suggestion: Move repeatable procedures to a skill so they load only when needed.
```

## Config

Create `.dietokenrc.json`:

```json
{
  "largeFileWarningTokens": 1500,
  "largeFileErrorTokens": 4000,
  "includeUserFiles": false,
  "ignore": ["node_modules/**", "dist/**", "coverage/**"]
}
```

## Development

```sh
npm install
npm test
```

## Roadmap

- `apply --dry-run` to generate optimized files.
- Hook installer for Codex and Claude.
- Support for Cursor, Gemini CLI, and Aider.
- HTML report.
- Optional per-model tokenizers.

## Design

See [docs/SDD.pt-BR.md](docs/SDD.pt-BR.md).

## License

MIT
