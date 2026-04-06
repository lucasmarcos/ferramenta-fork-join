import assert from "node:assert";
import { test } from "node:test";
import { parser } from "../out/forkJoinParser.js";
import { checkSyntax } from "../out/forkjoin/syntax.js";

test("check syntax", () => {
  const code = "FORK ;";
  const tree = parser.parse(code);
  const res = checkSyntax(tree);
  assert.strictEqual(res.length, 1);
});
