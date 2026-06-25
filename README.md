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

## Real benchmarks

### scan — waste identified

Tested on 3 real Claude Code projects:

| Project | Always-on tokens | Waste identified | % |
|---|---|---|---|
| claude-cookbooks | 855 tok | 350 tok | **40.9%** |
| ia-omnilogica | 1,085 tok | 384 tok | **35.4%** |
| omnilogica | 1,124 tok | 223 tok | **19.8%** |
| **Average** | **1,021 tok** | **319 tok** | **31.2%** |

### apply — waste eliminated

`apply` closes the loop: it removes vague rules in-place and extracts workflow sections to on-demand skills automatically.

| Project | Before | After | Saved | % |
|---|---|---|---|---|
| claude-cookbooks | 855 tok | 485 tok | 370 tok | **43.3%** |

Results vary by project. The more a `CLAUDE.md` has grown organically — accumulating workflows, vague conventions, and one-off instructions — the more waste dietoken finds and eliminates. Freshly written, intentional context scores close to 0%.

## Example output

```
$ dietoken scan --cwd claude-cookbooks

Dietoken scan

Files analyzed: 2
Total context estimate: 3,544 tokens
Always-on estimate: 855 tokens
Estimated waste: 350 tokens

Context files
- CLAUDE.md                              855 tokens  claude / always-on
- .claude/skills/cookbook-audit/SKILL.md 2,689 tokens  claude / on-demand

Findings
- warning vague-rule .claude/skills/cookbook-audit/SKILL.md:18
  Instruction is vague and hard for agents to verify.
  Suggestion: Replace vague quality words with observable rules, commands, or examples.
- warning workflow-in-always-on CLAUDE.md:60
  Workflow-like instruction appears in always-on context.
  Suggestion: Move repeatable procedures to a skill so they load only when needed.
- info hook-candidate .claude/skills/cookbook-audit/SKILL.md:71
  Instruction tries to prevent a mechanical action.
  Suggestion: Use a hook or permission policy for enforcement instead of relying only on prose.
```

```
$ dietoken gain

Dietoken — Savings Report
════════════════════════════════════════════════════════════════════

  Total scans        6
  Projects tracked   3
  Waste identified   1,753 tokens (cumulative across all scans)

By Project
────────────────────────────────────────────────────────────────────
  #  Project                  Scans   First scan         Now      Saved
────────────────────────────────────────────────────────────────────
  1.  omnilogica                  3    1,124 tok   1,124 tok         —
  2.  claude-cookbooks            2      855 tok     855 tok         —
  3.  ia omnilogica               1    1,085 tok   1,085 tok         —
────────────────────────────────────────────────────────────────────
```

## Example output

```
$ dietoken apply --dry-run --cwd claude-cookbooks

Dietoken apply --dry-run

  Would apply 10 fixes across 2 files
  Saved ~237 tokens

Changes
  CLAUDE.md
    ✓ extract "Key Rules" → .claude/skills/key-rules/SKILL.md  -25 tok
    ✓ extract "Adding a New Cookbook" → .claude/skills/adding-a-new-cookbook/SKILL.md  -10 tok
  .claude/skills/cookbook-audit/SKILL.md
    ✓ remove vague rule: "Always read style_guide.md first"  -33 tok
    ✓ remove vague rule: "Follows language best practices"  -8 tok
    ✓ remove vague rule: "What Makes a Good Cookbook"  -6 tok
    ...

Skipped (need manual attention)
  - hook-candidate .claude/skills/cookbook-audit/SKILL.md:71
    Use a hook or permission policy for enforcement instead of relying only on prose.

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
