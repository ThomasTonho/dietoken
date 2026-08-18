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
dietoken gain                    # Token waste report + savings history
dietoken scan                    # Detailed findings per file and line
dietoken scan --include-user     # Include ~/.claude and ~/.codex global files
dietoken scan --json             # Machine-readable output
dietoken scan --cwd ../project   # Analyze another directory
dietoken plan                    # Generate a step-by-step optimization plan
dietoken apply                   # Auto-fix: remove vague rules, extract workflows to skills
dietoken apply --dry-run         # Preview changes without writing files
```

## What to expect

Results vary by project. The more a `CLAUDE.md` has grown organically — accumulating workflows, vague conventions, and one-off instructions — the more waste dietoken finds and eliminates. Freshly written, intentional context scores close to 0%.

`apply` closes the loop: it removes vague rules in-place and extracts workflow sections to on-demand skills automatically.

## Example output

Both blocks below are the real output of the project in `examples/demo`, which
ships with this repository. Reproduce them with the same commands.

```
$ dietoken scan --cwd examples/demo

Dietoken scan

Files analyzed: 3
Total context estimate: 214 tokens
Agent configuration: 85 tokens (not sent to the model)
Always-on estimate: 149 tokens
Estimated waste: 116 tokens

Context files
- CLAUDE.md 149 tokens claude/instructions/always-on
- .claude/settings.json 85 tokens claude/config/on-demand
- .claude/skills/deploy/SKILL.md 65 tokens claude/skill/on-demand

Findings
- warning vague-rule CLAUDE.md:7
  Instruction is vague and hard for agents to verify.
  Suggestion: Replace vague quality words with observable rules, commands, or examples.
- warning workflow-in-always-on CLAUDE.md:12
  Workflow-like instruction appears in always-on context.
  Suggestion: Move repeatable procedures to a skill so they load only when needed.
- warning workflow-in-always-on CLAUDE.md:14
  Workflow-like instruction appears in always-on context.
  Suggestion: Move repeatable procedures to a skill so they load only when needed.
- warning workflow-in-always-on CLAUDE.md:15
  Workflow-like instruction appears in always-on context.
  Suggestion: Move repeatable procedures to a skill so they load only when needed.
- warning workflow-in-always-on CLAUDE.md:16
  Workflow-like instruction appears in always-on context.
  Suggestion: Move repeatable procedures to a skill so they load only when needed.
- warning workflow-in-always-on CLAUDE.md:17
  Workflow-like instruction appears in always-on context.
  Suggestion: Move repeatable procedures to a skill so they load only when needed.
- warning duplicate-guidance CLAUDE.md:21
  Duplicate guidance already appears on line 8 of this file.
  Suggestion: Keep this rule in one place to reduce token cost and avoid drift.
- info hook-candidate CLAUDE.md:9
  Instruction tries to prevent a mechanical action.
  Suggestion: Use a hook or permission policy for enforcement instead of relying only on prose.
- info path-scoped-candidate CLAUDE.md:10
  Instruction seems tied to specific paths or file types.
  Suggestion: Move this guidance closer to that path or into path-scoped rules when supported.
```

## Example output: apply

```
$ dietoken apply --cwd examples/demo --dry-run

Dietoken apply --dry-run

  Would apply 2 fixes across 1 file
  Saved ~17 tokens

Changes
  CLAUDE.md
    ✓ extract "Release procedure" → .claude/skills/release-procedure/SKILL.md  -6 tok
    ✓ remove duplicate: "Prefer TypeScript over JavaScript in new files."  -11 tok

Skipped (need manual attention)
  - vague-rule CLAUDE.md:7
    Replace vague quality words with observable rules, commands, or examples.
  - hook-candidate CLAUDE.md:9
    Use a hook or permission policy for enforcement instead of relying only on prose.
  - path-scoped-candidate CLAUDE.md:10
    Move this guidance closer to that path or into path-scoped rules when supported.

Run without --dry-run to apply changes.
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
  "tokensPerUnit": 1.3,
  "historyLimit": 500,
  "ignore": ["node_modules/**", "dist/**", "coverage/**"]
}
```

### Calibrating the estimate

Dietoken counts word and punctuation units, then multiplies by
`tokensPerUnit`. Real tokenizers split many words into more than one token, and
split accented and non-English text more aggressively, so the raw unit count
reads low. The default of 1.3 is a rule of thumb for Latin-script prose, not a
measurement of any particular tokenizer.

To calibrate for your own corpus, count the real tokens of a representative
file with the tokenizer your agent uses, divide that by the unit count
Dietoken reports at `"tokensPerUnit": 1`, and set the result.

## Development

```sh
npm install
npm test
```

## Roadmap

- [ ] Hook installer for Codex and Claude Code
- [ ] Support for Cursor, Gemini CLI, and Aider
- [ ] HTML report
- [ ] Per-model tokenizers

## Documentation

- [SDD — English](docs/SDD.md)
- [SDD — Português](docs/SDD.pt-BR.md)

## License

MIT
