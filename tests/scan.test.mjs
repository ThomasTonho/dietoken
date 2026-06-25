import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { test } from "node:test";
import assert from "node:assert/strict";
import { defaultConfig } from "../dist/config.js";
import { scanProject } from "../dist/commands/scan.js";

test("scanProject finds Codex and Claude instruction files", () => {
  const dir = mkdtempSync(join(tmpdir(), "dietoken-"));
  try {
    writeFileSync(join(dir, "AGENTS.md"), "Use clean code.\nNever run cat node_modules.\n", "utf8");
    writeFileSync(join(dir, "CLAUDE.md"), "Deploy procedure:\n1. build\n2. test\n", "utf8");

    const summary = scanProject({ cwd: dir, includeUserFiles: false }, defaultConfig);

    assert.equal(summary.files.length, 2);
    assert.ok(summary.totalTokens > 0);
    assert.ok(summary.findings.some((finding) => finding.code === "vague-rule"));
    assert.ok(summary.findings.some((finding) => finding.code === "hook-candidate"));
    assert.ok(summary.findings.some((finding) => finding.code === "workflow-in-always-on"));
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});

test("scanProject honors ignore patterns and accented Portuguese rules", () => {
  const dir = mkdtempSync(join(tmpdir(), "dietoken-"));
  try {
    mkdirSync(join(dir, ".claude", "rules", "ignored"), { recursive: true });
    writeFileSync(join(dir, "AGENTS.md"), "Use melhores práticas.\n", "utf8");
    writeFileSync(join(dir, ".claude", "rules", "keep.md"), "Regra visível.\n", "utf8");
    writeFileSync(join(dir, ".claude", "rules", "ignored", "drop.md"), "Regra ignorada.\n", "utf8");

    const summary = scanProject(
      { cwd: dir, includeUserFiles: false },
      { ...defaultConfig, ignore: [".claude/rules/ignored/**"] }
    );

    assert.deepEqual(
      summary.files.map((file) => file.relativePath).sort(),
      [".claude/rules/keep.md", "AGENTS.md"]
    );
    assert.ok(summary.findings.some((finding) => finding.code === "vague-rule" && finding.file === "AGENTS.md"));
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});
