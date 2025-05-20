import assert from "node:assert";
import { test } from "node:test";

import { checkSyntax } from "../out/syntax.js";

test("verifica sintaxe vazia", (t) => {
  const input = { rootNode: {} };
  const output = checkSyntax(input);
  const expected = [];
  assert.deepEqual(output, expected);
});
