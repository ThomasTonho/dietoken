import { execFileSync } from "node:child_process";
import { fileURLToPath } from "node:url";
import { test } from "node:test";
import assert from "node:assert/strict";

const cli = fileURLToPath(new URL("../dist/cli.js", import.meta.url));

function run(args) {
  return execFileSync(process.execPath, [cli, ...args], { encoding: "utf8" });
}

test("help flag works before and after a command", () => {
  const bare = run(["--help"]);

  assert.match(bare, /Usage:/);
  assert.equal(run(["scan", "--help"]), bare);
  assert.equal(run(["plan", "-h"]), bare);
});

test("version flag works after a command", () => {
  assert.equal(run(["scan", "--version"]), run(["--version"]));
});
