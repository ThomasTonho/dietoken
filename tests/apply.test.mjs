import { existsSync, mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { test } from "node:test";
import assert from "node:assert/strict";
import { defaultConfig } from "../dist/config.js";
import { applyFixes } from "../dist/commands/apply.js";

function tmpProject(files) {
  const dir = mkdtempSync(join(tmpdir(), "dietoken-apply-"));
  for (const [rel, content] of Object.entries(files)) {
    const abs = join(dir, rel);
    mkdirSync(join(abs, ".."), { recursive: true });
    writeFileSync(abs, content, "utf8");
  }
  return dir;
}

test("apply --dry-run does not modify files", () => {
  const dir = tmpProject({
    "CLAUDE.md": "Always use best practices.\n"
  });
  try {
    const original = readFileSync(join(dir, "CLAUDE.md"), "utf8");
    applyFixes({ cwd: dir, includeUserFiles: false }, defaultConfig, true);
    assert.equal(readFileSync(join(dir, "CLAUDE.md"), "utf8"), original);
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});

test("apply removes vague-rule lines", () => {
  const dir = tmpProject({
    "CLAUDE.md": "# Rules\n\nAlways use best practices.\nUse clean code.\nPrefer TypeScript.\n"
  });
  try {
    const result = applyFixes({ cwd: dir, includeUserFiles: false }, defaultConfig, false);
    const content = readFileSync(join(dir, "CLAUDE.md"), "utf8");

    assert.ok(result.totalTokensSaved > 0);
    assert.ok(!content.includes("best practices"));
    assert.ok(!content.includes("clean code"));
    assert.ok(content.includes("Prefer TypeScript"));
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});

test("apply removes duplicate-guidance lines", () => {
  const dir = tmpProject({
    "CLAUDE.md": "Never commit secrets to the repository.\n",
    "CLAUDE.local.md": "Never commit secrets to the repository.\n"
  });
  try {
    const result = applyFixes({ cwd: dir, includeUserFiles: false }, defaultConfig, false);

    assert.ok(result.files.some((f) => f.patches.some((p) => p.label.includes("duplicate"))));
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});

test("apply extracts workflow sections to skills", () => {
  const dir = tmpProject({
    "CLAUDE.md": [
      "# Project",
      "",
      "## Deploy Process",
      "",
      "1. Run npm test",
      "2. Build with npm run build",
      "3. Push to staging",
      ""
    ].join("\n")
  });
  try {
    const result = applyFixes({ cwd: dir, includeUserFiles: false }, defaultConfig, false);
    const content = readFileSync(join(dir, "CLAUDE.md"), "utf8");
    const skillPath = join(dir, ".claude", "skills", "deploy-process", "SKILL.md");

    assert.ok(result.files.some((f) => f.patches.some((p) => p.kind === "extract-skill")));
    assert.ok(!content.includes("npm test"), "workflow removed from CLAUDE.md");
    assert.ok(content.includes(".claude/skills/deploy-process/SKILL.md"), "reference left in place");
    assert.ok(existsSync(skillPath), "skill file created");
    assert.ok(readFileSync(skillPath, "utf8").includes("npm test"), "skill file has workflow content");
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});

test("apply returns skipped findings for non-automatable codes", () => {
  const dir = tmpProject({
    "CLAUDE.md": "Never run cat node_modules.\n"
  });
  try {
    const result = applyFixes({ cwd: dir, includeUserFiles: false }, defaultConfig, false);

    assert.ok(result.skipped.some((f) => f.code === "hook-candidate"));
    assert.equal(result.files.length, 0);
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});

test("apply reports zero savings on already-clean context", () => {
  const dir = tmpProject({
    "CLAUDE.md": "Run `npm test` before every commit.\n"
  });
  try {
    const result = applyFixes({ cwd: dir, includeUserFiles: false }, defaultConfig, false);

    assert.equal(result.totalTokensSaved, 0);
    assert.equal(result.files.length, 0);
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});
