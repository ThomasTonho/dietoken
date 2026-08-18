import { test } from "node:test";
import assert from "node:assert/strict";
import { estimateTokens } from "../dist/analyze/tokenize.js";

test("estimateTokens returns zero for blank input", () => {
  assert.equal(estimateTokens("  \n"), 0);
});

test("estimateTokens counts words and punctuation", () => {
  assert.equal(estimateTokens("Use AGENTS.md, not random notes."), 9);
});

test("estimateTokens keeps accented words together", () => {
  assert.equal(estimateTokens("Instruções úteis, configuração clara."), 6);
});

test("estimateTokens applies the calibration factor", () => {
  const text = "uma frase curta de exemplo";

  assert.equal(estimateTokens(text), 5);
  assert.equal(estimateTokens(text, 1.3), Math.ceil(5 * 1.3));
  assert.equal(estimateTokens(text, 1), 5);
});
