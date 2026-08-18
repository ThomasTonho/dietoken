import { execFileSync } from "node:child_process";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { test } from "node:test";
import assert from "node:assert/strict";

const root = fileURLToPath(new URL("..", import.meta.url));
const cli = fileURLToPath(new URL("../dist/cli.js", import.meta.url));
const readme = readFileSync(fileURLToPath(new URL("../README.md", import.meta.url)), "utf8");

function documented(command) {
  const start = readme.indexOf(`$ ${command}\n`);
  assert.notEqual(start, -1, `README should document: ${command}`);
  const from = start + command.length + 3;
  const end = readme.indexOf("```", from);
  return readme.slice(from, end).trim();
}

function actual(args) {
  return execFileSync(process.execPath, [cli, ...args], { cwd: root, encoding: "utf8" }).trim();
}

test("the README scan example matches a fresh run", () => {
  assert.equal(
    documented("dietoken scan --cwd examples/demo"),
    actual(["scan", "--cwd", "examples/demo"])
  );
});

test("the README apply example matches a fresh run", () => {
  assert.equal(
    documented("dietoken apply --cwd examples/demo --dry-run"),
    actual(["apply", "--cwd", "examples/demo", "--dry-run"])
  );
});
