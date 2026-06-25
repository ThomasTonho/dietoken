# Dietoken

<p align="center">
  <img src="dietinho.jpeg" alt="Dietinho" width="180" />
</p>

**Stop paying for context you never asked for.**

[![CI](https://github.com/ThomasTonho/dietoken/actions/workflows/ci.yml/badge.svg)](https://github.com/ThomasTonho/dietoken/actions/workflows/ci.yml)
[![npm version](https://img.shields.io/npm/v/dietoken.svg)](https://www.npmjs.com/package/dietoken)
[![License: MIT](https://img.shields.io/badge/license-MIT-blue.svg)](LICENSE)
[![Node.js](https://img.shields.io/badge/node-%3E%3D18-green.svg)](https://nodejs.org)

[🇧🇷 Versão em Português](docs/README.pt-BR.md) &nbsp;·&nbsp; [📖 Documentation](docs/SDD.md)

Dietoken audits the always-on context loaded by AI code agents — `CLAUDE.md`, `AGENTS.md`, rules, skills, hooks, and configs — and tells you exactly what's bloating your sessions before the first prompt is even sent.

## The problem

Your `CLAUDE.md` started as one line. Then it grew.

Now every session loads 4,000 tokens of conventions, stale workflows, vague reminders, and rules that haven't mattered in months. The agent reads all of it. You pay for all of it. And the instructions that actually matter compete with the noise.

Dietoken surfaces that cost and shows you how to fix it.

## Install

```sh
# One-liner (macOS / Linux)
curl -fsSL https://raw.githubusercontent.com/ThomasTonho/dietoken/main/install.sh | sh

# npm
npm install -g dietoken

# No install
npx dietoken scan
```

## Usage

```sh
dietoken scan                    # Analyze the current project
dietoken scan --include-user     # Include ~/.claude and ~/.codex global files
dietoken scan --json             # Machine-readable output
dietoken scan --cwd ../project   # Analyze another directory
dietoken plan                    # Generate a step-by-step optimization plan
```

## Example output

```
$ dietoken scan

  Files analyzed    6
  Always-on tokens  3,820
  Wasted tokens     1,340  ▓▓▓▓▓▓░░░░░░░░░░░░░  35%

  Findings

  ● large-always-on-file  CLAUDE.md
    2,880 tokens loaded on every session.
    → Move long workflows to skills. Keep only session-critical rules here.

  ● workflow-in-always-on  AGENTS.md:42
    Repeatable procedure found in always-on context.
    → Convert to a skill so it loads only when invoked.

  ● vague-rule  CLAUDE.md:17
    "Write clean code and follow best practices."
    → Remove or replace with a concrete, enforceable rule.

  ● duplicate-instruction  CLAUDE.md ↔ .claude/rules/style.md
    Same instruction appears in two places.
    → Keep one authoritative source.
```

## What it analyzes

| Agent | Files scanned |
|---|---|
| **Claude Code** | `CLAUDE.md`, `CLAUDE.local.md`, `.claude/CLAUDE.md`, `.claude/rules/**`, `.claude/skills/**`, `.claude/settings.json` |
| **Codex** | `AGENTS.md`, `AGENTS.override.md`, `.agents/skills/**`, `.codex/hooks.json`, `.codex/config.toml` |

Pass `--include-user` to also scan global files in `~/.claude` and `~/.codex`.

## Findings explained

| Finding | What it means |
|---|---|
| `large-always-on-file` | File exceeds the token threshold and loads on every session |
| `vague-rule` | Instruction like "use best practices" that an agent can't act on |
| `workflow-in-always-on` | Step-by-step procedure that belongs in a skill, not global context |
| `path-specific-instruction` | Rule scoped to one directory but loaded everywhere |
| `prose-to-hook` | Rule that would be more reliably enforced as a hook or permission |
| `duplicate-instruction` | Same instruction found across multiple files |

## Config

```json
// .dietokenrc.json
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

- [ ] `apply --dry-run` — generate optimized files without touching originals
- [ ] Hook installer for Codex and Claude Code
- [ ] Support for Cursor, Gemini CLI, and Aider
- [ ] HTML report
- [ ] Per-model tokenizers

## Documentation

- [SDD — English](docs/SDD.md)
- [SDD — Português](docs/SDD.pt-BR.md)

## License

MIT
