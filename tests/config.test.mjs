import { mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { test } from "node:test";
import assert from "node:assert/strict";
import { loadConfig, defaultConfig } from "../dist/config.js";

function withConfig(body, run) {
  const dir = mkdtempSync(join(tmpdir(), "dietoken-"));
  try {
    writeFileSync(join(dir, ".dietokenrc.json"), body, "utf8");
    return run(dir);
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
}

test("loadConfig rejects values that would poison the estimate", () => {
  withConfig('{"tokensPerUnit":"muito"}', (dir) => {
    assert.throws(() => loadConfig(dir), /tokensPerUnit must be a positive number/);
  });

  withConfig('{"largeFileWarningTokens":-10}', (dir) => {
    assert.throws(() => loadConfig(dir), /largeFileWarningTokens must be a positive number/);
  });

  withConfig('{"largeFileWarningTokens":4000,"largeFileErrorTokens":100}', (dir) => {
    assert.throws(() => loadConfig(dir), /must not be smaller than/);
  });

  withConfig('{"ignore":[1,2]}', (dir) => {
    assert.throws(() => loadConfig(dir), /ignore must be a list of glob strings/);
  });
});

test("loadConfig names the file when the JSON is broken", () => {
  withConfig("{ isso nao e json }", (dir) => {
    assert.throws(() => loadConfig(dir), /\.dietokenrc\.json is not valid JSON/);
  });
});

test("loadConfig keeps defaults for anything not overridden", () => {
  withConfig('{"tokensPerUnit":2}', (dir) => {
    const config = loadConfig(dir);

    assert.equal(config.tokensPerUnit, 2);
    assert.equal(config.historyLimit, defaultConfig.historyLimit);
    assert.deepEqual(config.ignore, defaultConfig.ignore);
  });
});
