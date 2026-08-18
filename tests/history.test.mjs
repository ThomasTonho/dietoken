import { execFileSync } from "node:child_process";
import { mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { fileURLToPath } from "node:url";
import { test } from "node:test";
import assert from "node:assert/strict";

const cli = fileURLToPath(new URL("../dist/cli.js", import.meta.url));

test("history keeps only the configured number of records", () => {
  const home = mkdtempSync(join(tmpdir(), "dietoken-home-"));
  const project = mkdtempSync(join(tmpdir(), "dietoken-"));
  try {
    writeFileSync(join(project, "CLAUDE.md"), "Regra do projeto.\n", "utf8");
    writeFileSync(join(project, ".dietokenrc.json"), JSON.stringify({ historyLimit: 3 }), "utf8");

    for (let run = 0; run < 5; run += 1) {
      execFileSync(process.execPath, [cli, "scan", "--cwd", project], {
        encoding: "utf8",
        env: { ...process.env, HOME: home }
      });
    }

    const records = readFileSync(join(home, ".dietoken", "history.jsonl"), "utf8").split("\n").filter(Boolean);

    assert.equal(records.length, 3);
  } finally {
    rmSync(home, { recursive: true, force: true });
    rmSync(project, { recursive: true, force: true });
  }
});

test("gain survives a history file with damaged records", () => {
  const home = mkdtempSync(join(tmpdir(), "dietoken-home-"));
  try {
    mkdirSync(join(home, ".dietoken"), { recursive: true });
    writeFileSync(
      join(home, ".dietoken", "history.jsonl"),
      [
        JSON.stringify({ ts: "2026-01-01T00:00:00.000Z", cwd: "/a", projectName: "quebrado", filesAnalyzed: 1, alwaysOnTokens: null, estimatedWasteTokens: null, findingCount: 0 }),
        "{ nao e json",
        JSON.stringify({ ts: "2026-01-02T00:00:00.000Z", cwd: "/b", projectName: "inteiro", filesAnalyzed: 2, alwaysOnTokens: 120, estimatedWasteTokens: 30, findingCount: 4 })
      ].join("\n") + "\n",
      "utf8"
    );

    const output = execFileSync(process.execPath, [cli, "gain"], {
      encoding: "utf8",
      env: { ...process.env, HOME: home }
    });

    assert.match(output, /inteiro/);
    assert.doesNotMatch(output, /quebrado/);
  } finally {
    rmSync(home, { recursive: true, force: true });
  }
});
