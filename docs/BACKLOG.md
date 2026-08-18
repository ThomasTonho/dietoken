# Dietoken backlog

Ordered list of known defects and gaps, each with the evidence that produced
it, the change proposed and how to tell the change worked. Items are worked
top to bottom, one pull request each.

Status: `open`, `in progress`, `done`.

---

## P0-1 — `apply` destroys `@import` directives — `done`

**Problem.** `readContextFile` stores the *resolved* content of a file, with
every `@file.md` import already inlined. `applyFixes` writes that resolved
content back to the original path. The import directive is lost and the
imported file's content is copied into the parent.

**Evidence.** A `CLAUDE.md` containing `@rules.md` plus four lines, after
`dietoken apply`:

```
before: @rules.md / # Projeto / Use clean code sempre.
after:  # Regras herdadas / Linha importante ... / # Projeto
```

The directive is gone, `rules.md` is duplicated in two places, and Claude Code
no longer loads `rules.md` at all. Line numbers in findings also refer to the
resolved text, so patches can land on the wrong lines of the file on disk.

**Change.** Stop inlining. Discover imported files as their own `ContextFile`
entries, inheriting agent, scope and always-on from the importer, with a
recursion limit and a cycle guard. `ContextFile.content` then always matches
the bytes on disk.

**Acceptance.** Applying fixes to a project that uses imports leaves every
`@` directive intact, and an imported file appears as its own row in `scan`.

---

## P0-2 — `apply` rewrites files with no backup and no clean-tree check — `done`

**Problem.** `applyFixes` calls `writeFileSync` on the user's instruction
files. There is no backup, no confirmation and no check that the working tree
is clean, so a bad heuristic silently destroys uncommitted work.

**Evidence.** `grep -c 'backup|isClean|git' src/commands/apply.ts` returns 0.

**Change.** Refuse to write when the target is inside a git repository with
uncommitted changes to that file, unless `--force` is passed. Keep `--dry-run`
as is.

**Acceptance.** `apply` on a dirty file exits non-zero with an explanation and
changes nothing; `--force` restores current behaviour.

---

## P1-3 — Config files are counted as context — `open`

**Problem.** `totalTokens` sums every discovered file, including
`.claude/settings.json` and `.codex/config.toml`. Those files configure the
agent; they never enter the model's context window.

**Evidence.** Scanning a real project reports 3202 total tokens, of which 2561
(80%) come from `.claude/settings.local.json`.

**Change.** Report configuration weight separately from context weight. This
changes the headline number, so the README benchmarks must be regenerated in
the same pull request.

**Acceptance.** `scan` shows context and configuration as distinct totals, and
the README numbers match a fresh run.

---

## P1-4 — The token estimate has no calibration — `open`

**Problem.** `estimateTokens` counts word and punctuation units. Real
tokenizers split many words into several tokens, and split accented and
non-English text more aggressively, so the estimate drifts from the number
users are billed for, in a direction that varies by language.

**Change.** Keep the unit count as the base, apply a calibration factor, and
expose it in `.dietokenrc.json` so a user who has measured their own corpus
can correct it.

**Acceptance.** Default output stays within a documented margin of a reference
tokenizer on a fixed sample, and the factor is configurable.

---

## P1-5 — Waste estimates and token estimates use different units — `done`

**Problem.** `estimateLineWaste` returns `ceil(length / 5)` characters-based
units, while file totals come from word-unit counting. The two are not
comparable, and a line's waste can exceed the token estimate of the whole
file that contains it.

**Evidence.** A five-word file estimates 8 tokens; a single flagged line in it
reports 9 wasted tokens.

**Change.** Derive line waste from `estimateTokens` on the line itself.

**Acceptance.** For every finding, waste never exceeds the token estimate of
its own line.

---

## P2-6 — `vague-rule` deletes whole lines on a single word match — `done`

**Problem.** `FIXABLE_CODES` includes `vague-rule`, so `apply` deletes any
line matching words such as `simple`, `good` or `properly`. A line can carry a
real instruction and one soft adjective; the whole line is removed.

**Change.** Drop `vague-rule` from the automatically fixable set, or narrow it
to lines that contain nothing but the vague phrase. Keep reporting it.

**Acceptance.** A line combining a concrete rule with a vague adjective
survives `apply` and is still reported by `scan`.

---

## P2-7 — Duplicate detection ignores repeats inside one file — `done`

**Problem.** `findDuplicates` only reports a repeat when it appears in a
different file (`first.file !== file.relativePath`). The same rule stated
three times in one long `CLAUDE.md` costs tokens on every request and is never
reported.

**Change.** Report duplicates within a file as well, pointing at the first
occurrence.

**Acceptance.** A file repeating one long line twice produces one
`duplicate-guidance` finding.

---

## P2-8 — Discovery misses agents and commands — `done`

**Problem.** Project discovery covers `CLAUDE.md`, `.claude/rules`,
`.claude/skills`, `AGENTS.md` and the config files, but not `.claude/agents`
or `.claude/commands`. Both hold instruction text that reaches the model.

**Change.** Add both directories to project and user scope discovery.

**Acceptance.** A project with `.claude/agents/foo.md` lists that file in
`scan`.

---

## P2-9 — Imports starting with `~/` are not resolved — `done`

**Problem.** Import paths are resolved relative to the importing file only.
`@~/.claude/shared.md`, which Claude Code accepts, is never found and its cost
is invisible.

**Change.** Expand a leading `~/` to the home directory before resolving.

**Acceptance.** An import written as `@~/...` is discovered and counted.

Closed together with P0-1, which replaced the inlining code that owned path
resolution.

---

## P3-10 — Scan history grows without bound — `open`

**Problem.** `appendHistory` appends one JSON line per scan to
`~/.dietoken/history.jsonl` and nothing ever trims it. On a repository that
scans per commit the file grows forever and `gain` reads all of it.

**Change.** Keep the most recent N records, N configurable.

**Acceptance.** History stays at or below the configured size across repeated
scans.

---

## P1-11 — README benchmarks predate the estimator changes — `open`

**Problem.** The numbers published in the README were measured before waste
stopped being counted once per matching rule and before line waste switched to
the shared estimator. They no longer describe what the tool prints.

**Change.** Re-run the three benchmark projects and update the README, in the
same pull request as any further change to the estimate.

**Acceptance.** A fresh run on each documented project reproduces the numbers
in the README.
