import assert from "node:assert";
import { test } from "node:test";
import { error } from "../out/error.js";
import { parser } from "../out/forkJoinParser.js";

test("detecta erro", () => {
  const code = "FORK ;";
  const tree = parser.parse(code);
  const res = error(tree);
  assert.strictEqual(res.length, 1);
});

test("sem erro", () => {
  const code = "FORK l;";
  const tree = parser.parse(code);
  const res = error(tree);
  assert.strictEqual(res.length, 0);
});
