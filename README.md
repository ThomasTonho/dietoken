# Dietoken

Kill wasted tokens. Keep better context.

Dietoken is a token diet tool for AI coding agents like Codex and Claude Code. It scans instruction files, skills, rules, hooks, and config files to find always-on context bloat, duplicated guidance, vague rules, and workflows that should move into skills or scoped rules.

## Why

AI coding agents work better with concise, relevant context. Large `AGENTS.md`, `CLAUDE.md`, rules, and skill files often become dumping grounds for every convention, workflow, warning, and reminder.

That creates two problems:

- tokens are spent before the real task starts;
- important instructions compete with stale, vague, or duplicated guidance.

Dietoken helps you see that cost and clean it up.

## Install

```bash
npm install -g dietoken
```

Or run without installing:

```bash
npx dietoken scan
```

## Usage

Analyze the current project:

```bash
dietoken scan
```

Print JSON:

```bash
dietoken scan --json
```

Generate an optimization plan:

```bash
dietoken plan
```

Analyze another directory:

```bash
dietoken scan --cwd ../my-project
```

Include user-level files from `~/.codex` and `~/.claude`:

```bash
dietoken scan --include-user
```

## What Dietoken Scans

Codex:

- `AGENTS.md`
- `AGENTS.override.md`
- `.agents/skills/**/SKILL.md`
- `.codex/hooks.json`
- `.codex/config.toml`
- optional user-level `~/.codex/*`

Claude Code:

- `CLAUDE.md`
- `CLAUDE.local.md`
- `.claude/CLAUDE.md`
- `.claude/rules/**/*.md`
- `.claude/skills/**/SKILL.md`
- `.claude/settings.json`
- optional user-level `~/.claude/*`

## Findings

Dietoken reports:

- large always-on instruction files;
- vague rules like "use best practices" or "write clean code";
- long workflows that should become skills;
- path-specific guidance that should move closer to matching files;
- prose rules that should become hooks or permission policies;
- duplicated guidance across files.

## Example

```txt
Dietoken scan

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

## Roadmap

- `apply --dry-run` for generated optimized files.
- Codex and Claude hook installers.
- Support for Cursor, Gemini CLI, and Aider.
- HTML reports.
- Optional model-specific tokenizers.

## Design

See [docs/SDD.pt-BR.md](docs/SDD.pt-BR.md).

## License

MIT
