import assert from "node:assert";
import { test } from "node:test";
import { parser } from "../out/forkJoinParser.js";
import { checkSyntax } from "../out/forkjoin/syntax.js";

test("detecta erro", () => {
  const code = "FORK ;";
  const tree = parser.parse(code);
  const res = checkSyntax(tree);
  assert.strictEqual(res.length, 1);
});

test("sem erro", () => {
  const code = "FORK l;";
  const tree = parser.parse(code);
  const res = checkSyntax(tree);
  assert.strictEqual(res.length, 0);
});
