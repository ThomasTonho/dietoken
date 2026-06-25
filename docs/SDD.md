# Dietoken SDD

## Vision

Dietoken is a CLI for reducing the context that's always loaded into code agents, with an initial focus on Codex and Claude Code.

The tool doesn't try to "compress everything". It diagnoses where tokens are spent before any task begins: instruction files, rules, skills, hooks, and configuration files that get pulled into context on every session.

## Problem

Agents like Codex and Claude Code work best when they receive clear, concise, and actionable context. In practice, many projects accumulate long instructions across `AGENTS.md`, `CLAUDE.md`, `.claude/rules`, skills, and related files.

That context ends up always-on or trivially easy to load, even when the current task has nothing to do with it. The result:

- more tokens burned at the start of every session;
- more noise before the actual task begins;
- duplicated or conflicting rules;
- long workflows stored in the wrong place;
- reduced adherence to the rules that actually matter.

## Goals

- Measure the approximate context cost of Codex and Claude Code configurations.
- Identify files and blocks that are likely wasting tokens.
- Suggest where each instruction should live: always-on, skill, path-scoped rule, hook, or removal.
- Generate an optimization plan without modifying files by default.
- Stay local-first — no API key, no content sent to third parties.

## Non-goals

- No LLM calls to summarize files in the initial version.
- No automatic file edits without `--apply`.
- Not a replacement for Codex, Claude Code, RTK, Repomix, or code linters.
- No perfect semantic analysis. The first version uses transparent heuristics.

## Users

- Developers who use Codex or Claude Code daily.
- Teams that maintain `AGENTS.md`, `CLAUDE.md`, skills, or rules.
- Repo authors who want to configure agents without bloating context.

## Principles

1. Local-first: no network calls to analyze the project.
2. Safe by default: `scan` and `plan` never modify files.
3. Explainable: every alert shows the file, line, and reason.
4. Multi-agent: Codex and Claude Code first, other agents later.
5. Low magic: simple heuristics that are configurable and testable.

## Analyzed surfaces

### Codex

- `AGENTS.md`
- `AGENTS.override.md`
- `.agents/skills/**/SKILL.md`
- `.codex/hooks.json`
- `.codex/config.toml`
- `~/.codex/AGENTS.md`
- `~/.codex/hooks.json`
- `~/.codex/config.toml`

### Claude Code

- `CLAUDE.md`
- `CLAUDE.local.md`
- `.claude/CLAUDE.md`
- `.claude/rules/**/*.md`
- `.claude/skills/**/SKILL.md`
- `.claude/settings.json`
- `.claude/settings.local.json`
- `~/.claude/CLAUDE.md`
- `~/.claude/rules/**/*.md`
- `~/.claude/settings.json`

## Commands

### `dietoken gain`

Shows a consolidated token waste report: a visual waste meter, a breakdown by finding type, and a ranked list of the heaviest always-on files.

```bash
dietoken gain
```

Expected output:

```txt
Dietoken — Token Waste Report
════════════════════════════════════════════════════════════

  Files analyzed    4
  Always-on tokens  5,200
  Wasted tokens     1,800 (34.6%)
  Waste meter       ████████░░░░░░░░░░░░░░░░  34.6%

By Finding
────────────────────────────────────────────────────────────
  #  Finding                              Count   Wasted   Share
────────────────────────────────────────────────────────────
  1.  workflow-in-always-on                   2    1,100   61.1%
  2.  vague-rule                              3      700   38.9%
────────────────────────────────────────────────────────────

Top always-on files
────────────────────────────────────────────────────────────
  1.  CLAUDE.md                        2,880 tokens  ██████░░░░░░
  2.  AGENTS.md                        1,240 tokens  ███░░░░░░░░░
────────────────────────────────────────────────────────────

  Run "dietoken scan" for per-finding details.
  Run "dietoken plan" for a step-by-step optimization plan.
```

### `dietoken scan`

Reads known context files, estimates tokens, and prints a detailed diagnostic by file and finding.

```bash
dietoken scan
```

Expected output:

```txt
Dietoken scan

Always-on context
AGENTS.md       1,240 tokens
CLAUDE.md       2,880 tokens

Findings
warning CLAUDE.md:42 vague-rule
warning AGENTS.md:88 workflow-in-always-on

Estimated waste: 1,100 tokens
```

### `dietoken plan`

Generates a Markdown plan with reorganization suggestions.

```bash
dietoken plan
```

Output:

```txt
Wrote .dietoken/plan.md
```

### `dietoken apply`

Future. Applies proposed changes with backup and diff. Out of scope for the initial MVP.

### `dietoken hooks install`

Future. Installs hooks to prevent noisy commands. Out of scope for the initial MVP.

## Heuristics v0.1

### Token estimate

Local, deterministic estimation:

- words and punctuation are counted as units;
- the result is approximate, not identical to the model's tokenizer;
- the goal is to compare relative size and trends, not to be byte-perfect.

### Large file

Fires when an always-on file exceeds a configurable threshold.

Default thresholds:

- warning: above 1,500 tokens;
- error: above 4,000 tokens.

### Vague rule

Fires when an instruction contains terms that are hard to verify:

- "best practices"
- "clean code"
- "properly"
- "robust"
- "simple"
- "good"
- "adequate"

### Workflow in always-on

Fires when a block contains many steps or process-oriented keywords:

- "step"
- "deploy"
- "release"
- "migration"
- "procedure"
- long numbered lists

Suggestion: move to a skill.

### Path-scoped rule

Fires when a block mentions file or directory patterns:

- `src/**`
- `*.tsx`
- `tests/`
- `api/`
- `frontend`
- `backend`

Suggestion: move to a path-scoped rule when the agent supports it.

### Hook candidate

Fires when an instruction tries to block a mechanical action:

- "never run"
- "do not run"
- "do not read"
- `node_modules`
- `dist`
- `coverage`
- `.next`

Suggestion: move to a hook, because an instruction is not enforcement.

### Simple duplicate

Normalizes lines and detects repeated phrases across files.

## `@include` resolution

Dietoken automatically resolves `@filename.md` references in Markdown files. When a line contains only `@some-file.md`, the referenced file's content is loaded and substituted in place before tokens are estimated.

Behavior:

- recursive resolution with a maximum depth of 3 levels;
- the path is resolved relative to the file that contains the `@include`;
- if the referenced file does not exist, the original line is kept without error;
- the token estimate reflects the resolved content, not the raw line.

This ensures that modular instruction setups — such as a `CLAUDE.md` that includes `@RTK.md` — are counted by the real size that reaches the agent, not just the size of the entry file.

## Architecture

```txt
src/
  cli.ts
  commands/
    scan.ts
    plan.ts
  discover/
    files.ts
  analyze/
    tokenize.ts
    classify.ts
  report/
    console.ts
    gain.ts
    markdown.ts
  config.ts
  types.ts
```

## Data model

```ts
type AgentKind = "codex" | "claude";

type ContextFile = {
  agent: AgentKind;
  path: string;
  scope: "project" | "user";
  kind: "instructions" | "skill" | "rule" | "hook" | "config";
  alwaysOn: boolean;
  content: string;
  tokenEstimate: number;
};

type Finding = {
  severity: "info" | "warning" | "error";
  code: string;
  message: string;
  file: string;
  line?: number;
  suggestion?: string;
  estimatedWasteTokens?: number;
};
```

## Configuration

Optional config file:

```json
{
  "largeFileWarningTokens": 1500,
  "largeFileErrorTokens": 4000,
  "includeUserFiles": false,
  "ignore": ["node_modules/**", "dist/**"]
}
```

## Outputs

### Text

Default for terminal use.

### JSON

For CI pipelines and tooling.

```bash
dietoken scan --json
```

### Markdown

Plan generated by `dietoken plan`.

## MVP

### v0.1 ✓

- `dietoken` CLI.
- `scan` command.
- Discovery of Codex and Claude context files in the current project.
- Token estimation.
- Findings: large file, vague rule, workflow in always-on, hook candidate, simple duplicate.
- Text and JSON output.
- Unit tests.

### v0.2 ✓

- `plan` command.
- `.dietoken/plan.md` output.
- Suggestions grouped by type.
- README in English and Portuguese.

### v0.3

- `apply --dry-run`.
- Generation of `AGENTS.md`, `CLAUDE.md`, rules, and skills into `.dietoken/generated`.

### v0.4

- Hooks for Codex and Claude.
- Protection against noisy commands.

## MVP acceptance criteria

- `npm test` passes.
- `npm run build` passes.
- `npx dietoken scan` works on a project with `AGENTS.md` or `CLAUDE.md`.
- `dietoken scan --json` returns valid JSON.
- `dietoken plan` writes `.dietoken/plan.md`.
- README in both Portuguese and English explains the problem, installation, and usage.

## Risks

- Token estimates will not match the real model tokenizer exactly. Mitigation: communicate clearly that these are estimates.
- Heuristics may produce false positives. Mitigation: severity levels, explanations, and configurable thresholds.
- Automatic edits can be dangerous. Mitigation: `apply` is out of scope for the initial MVP and will always require dry-run first.

## Roadmap

- Support for Cursor, Gemini CLI, and Aider.
- Real model tokenizer when available locally.
- HTML visual report.
- Optional integration with Codex and Claude hooks.
- Project-level custom rules.
