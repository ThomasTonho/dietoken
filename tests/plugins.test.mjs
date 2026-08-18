import { execFileSync } from "node:child_process";
import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { fileURLToPath } from "node:url";
import { test } from "node:test";
import assert from "node:assert/strict";

const cli = fileURLToPath(new URL("../dist/cli.js", import.meta.url));

test("installed plugin skills count toward the resident total", () => {
  const home = mkdtempSync(join(tmpdir(), "dietoken-home-"));
  const project = mkdtempSync(join(tmpdir(), "dietoken-"));
  try {
    const skill = join(home, ".claude", "plugins", "marketplaces", "demo", "skills", "ship");
    mkdirSync(skill, { recursive: true });
    mkdirSync(join(skill, "node_modules", "deep"), { recursive: true });
    writeFileSync(
      join(skill, "SKILL.md"),
      `---\nname: ship\ndescription: Publish the current build to production\n---\n\n${"Detalhe do procedimento.\n".repeat(50)}`,
      "utf8"
    );
    writeFileSync(join(skill, "node_modules", "deep", "SKILL.md"), "---\nname: noise\n---\n", "utf8");
    writeFileSync(join(project, "CLAUDE.md"), "Regra do projeto.\n", "utf8");

    const summary = JSON.parse(
      execFileSync(process.execPath, [cli, "scan", "--cwd", project, "--include-user", "--json"], {
        encoding: "utf8",
        env: { ...process.env, HOME: home }
      })
    );

    const skills = summary.files.filter((file) => file.kind === "skill");

    assert.equal(skills.length, 1, "node_modules inside a plugin must not be walked");
    assert.ok(skills[0].residentTokens > 0);
    assert.ok(skills[0].residentTokens < skills[0].tokenEstimate / 10);
    assert.ok(summary.residentTokens >= skills[0].residentTokens);
  } finally {
    rmSync(home, { recursive: true, force: true });
    rmSync(project, { recursive: true, force: true });
  }
});
