import assert from "node:assert";
import { test } from "node:test";
import { parser } from "../out/forkjoin/parser.js";
import { resolve } from "../out/forkjoin/resolve.js";
import { treewalk } from "../out/forkjoin/treewalk.js";

test("resolve", () => {
  const code = "FORK l; l: QUIT;";
  const tree = parser.parse(code);
  const walked = treewalk(code, tree);
  const elements = resolve(walked.threads);
  assert.ok(Array.isArray(elements.nodes), "Should return nodes array");
  assert.ok(Array.isArray(elements.edges), "Should return edges array");
  assert.strictEqual(elements.nodes.length, 0, "Should have no nodes");
  assert.strictEqual(elements.edges.length, 0, "Should have no edges");
});
