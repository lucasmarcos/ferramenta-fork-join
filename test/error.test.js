import { test } from "node:test";
import assert from "node:assert";
import { parser } from "../out/forkJoinParser.js";
import { error } from "../out/error.js";

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
