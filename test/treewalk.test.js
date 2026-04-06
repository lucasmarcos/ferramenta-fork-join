import { test } from "node:test";
import assert from "node:assert";
import { parser } from "../out/forkJoinParser.js";
import { treewalk } from "../out/forkjoin/treewalk.js";

test("treewalk", () => {
  const code = "FORK l; l: QUIT;";
  const tree = parser.parse(code);
  const res = treewalk(code, tree);
  assert.strictEqual(res.errors.length, 0);
  assert.ok(res.threads.has("0"));
});
