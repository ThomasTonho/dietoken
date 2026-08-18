import { mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { test } from "node:test";
import assert from "node:assert/strict";
import { defaultConfig } from "../dist/config.js";
import { estimateTokens } from "../dist/analyze/tokenize.js";
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

test("scanProject does not apply prose rules to config files", () => {
  const dir = mkdtempSync(join(tmpdir(), "dietoken-"));
  try {
    mkdirSync(join(dir, ".claude"), { recursive: true });
    writeFileSync(
      join(dir, ".claude", "settings.json"),
      JSON.stringify({ permissions: { deny: ["Read(node_modules/**)", "Read(dist/**)"] } }, null, 2),
      "utf8"
    );
    writeFileSync(join(dir, "CLAUDE.md"), "Never run cat node_modules.\n", "utf8");

    const summary = scanProject({ cwd: dir, includeUserFiles: false }, defaultConfig);
    const configFindings = summary.findings.filter((finding) => finding.file.includes("settings.json"));

    assert.deepEqual(configFindings, []);
    assert.ok(summary.findings.some((finding) => finding.code === "hook-candidate" && finding.file === "CLAUDE.md"));
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});

test("scanProject counts each wasteful line once and never exceeds the total", () => {
  const dir = mkdtempSync(join(tmpdir(), "dietoken-"));
  try {
    const filler = [
      "O projeto usa Node com TypeScript para gerar relatorios de contexto.",
      "Cada execucao grava um registro no historico local do usuario.",
      "As mensagens do relatorio saem em ingles por padrao no terminal.",
      "O pacote publica somente a pasta compilada e a documentacao."
    ].join("\n");
    writeFileSync(join(dir, "CLAUDE.md"), `Use clean code and never run node_modules.\n${filler}\n`, "utf8");

    const summary = scanProject({ cwd: dir, includeUserFiles: false }, defaultConfig);
    const onLineOne = summary.findings.filter((finding) => finding.line === 1);
    const worst = Math.max(...onLineOne.map((finding) => finding.estimatedWasteTokens ?? 0));

    assert.ok(onLineOne.length > 1, "line should trigger more than one rule");
    assert.equal(summary.estimatedWasteTokens, worst);
    assert.ok(summary.estimatedWasteTokens <= summary.totalTokens);
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});

test("no finding claims more waste than its own line costs", () => {
  const dir = mkdtempSync(join(tmpdir(), "dietoken-"));
  try {
    writeFileSync(
      join(dir, "CLAUDE.md"),
      "Use clean code and never run node_modules.\nDeploy procedure documented properly.\nOk.\n",
      "utf8"
    );

    const summary = scanProject({ cwd: dir, includeUserFiles: false }, defaultConfig);
    const lines = readFileSync(join(dir, "CLAUDE.md"), "utf8").split("\n");

    assert.ok(summary.findings.length > 0);
    for (const finding of summary.findings) {
      if (finding.line === undefined) continue;
      const cost = estimateTokens(lines[finding.line - 1], defaultConfig.tokensPerUnit);
      assert.ok(
        (finding.estimatedWasteTokens ?? 0) <= cost,
        `${finding.code} claims ${finding.estimatedWasteTokens} of ${cost} tokens`
      );
    }
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});

test("duplicate guidance is reported inside a single file", () => {
  const dir = mkdtempSync(join(tmpdir(), "dietoken-"));
  try {
    const rule = "Sempre descreva o comando exato que valida a mudanca antes de abrir o pull request.";
    writeFileSync(join(dir, "CLAUDE.md"), `# Regras\n\n${rule}\n\n## Revisao\n\n${rule}\n`, "utf8");

    const summary = scanProject({ cwd: dir, includeUserFiles: false }, defaultConfig);
    const duplicates = summary.findings.filter((finding) => finding.code === "duplicate-guidance");

    assert.equal(duplicates.length, 1);
    assert.equal(duplicates[0].line, 7);
    assert.match(duplicates[0].message, /line 3 of this file/);
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});

test("scanProject discovers agents and commands", () => {
  const dir = mkdtempSync(join(tmpdir(), "dietoken-"));
  try {
    mkdirSync(join(dir, ".claude", "agents"), { recursive: true });
    mkdirSync(join(dir, ".claude", "commands"), { recursive: true });
    writeFileSync(join(dir, ".claude", "agents", "reviewer.md"), "Revisa o diff e aponta riscos.\n", "utf8");
    writeFileSync(join(dir, ".claude", "commands", "deploy.md"), "Publica a versao atual.\n", "utf8");

    const summary = scanProject({ cwd: dir, includeUserFiles: false }, defaultConfig);
    const kinds = new Map(summary.files.map((file) => [file.relativePath, file.kind]));

    assert.equal(kinds.get(join(".claude", "agents", "reviewer.md")), "agent");
    assert.equal(kinds.get(join(".claude", "commands", "deploy.md")), "command");
    assert.ok(summary.files.every((file) => file.alwaysOn === false));
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});

test("configuration weight is reported apart from context weight", () => {
  const dir = mkdtempSync(join(tmpdir(), "dietoken-"));
  try {
    mkdirSync(join(dir, ".claude"), { recursive: true });
    writeFileSync(join(dir, "CLAUDE.md"), "Regra curta do projeto.\n", "utf8");
    writeFileSync(
      join(dir, ".claude", "settings.json"),
      JSON.stringify({ permissions: { allow: ["Bash(npm test)", "Read(src/**)"] } }, null, 2),
      "utf8"
    );

    const summary = scanProject({ cwd: dir, includeUserFiles: false }, defaultConfig);
    const claudeMd = summary.files.find((file) => file.relativePath === "CLAUDE.md");

    assert.equal(summary.totalTokens, claudeMd.tokenEstimate);
    assert.ok(summary.configTokens > 0);
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});

test("a skill costs its description while it sits idle, not its body", () => {
  const dir = mkdtempSync(join(tmpdir(), "dietoken-"));
  try {
    mkdirSync(join(dir, ".claude", "skills", "deploy"), { recursive: true });
    writeFileSync(join(dir, "CLAUDE.md"), "Regra sempre carregada do projeto.\n", "utf8");
    writeFileSync(
      join(dir, ".claude", "skills", "deploy", "SKILL.md"),
      `---\nname: deploy\ndescription: Ship the service to production\n---\n\n${"Passo detalhado do procedimento de publicacao.\n".repeat(40)}`,
      "utf8"
    );

    const summary = scanProject({ cwd: dir, includeUserFiles: false }, defaultConfig);
    const skill = summary.files.find((file) => file.kind === "skill");
    const claudeMd = summary.files.find((file) => file.kind === "instructions");

    assert.ok(skill.tokenEstimate > 200, "the body should be large");
    assert.ok(skill.residentTokens < 20, "only the description stays resident");
    assert.equal(summary.residentTokens, claudeMd.tokenEstimate + skill.residentTokens);
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});
