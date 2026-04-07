import assert from "node:assert";
import { test } from "node:test";
import { parser } from "../out/forkjoin/parser.js";
import { resolve } from "../out/forkjoin/resolve.js";
import { treewalk } from "../out/forkjoin/treewalk.js";

test("FORK at the very beginning of the code", () => {
  const code = `
FORK ROT_D;
A;

ROT_D:
  D;
  QUIT;
  `;
  const tree = parser.parse(code);
  const walked = treewalk(code, tree);
  const elements = resolve(walked.threads);

  const nodeA = elements.nodes.find((n) => n.data.label === "A");
  const nodeD = elements.nodes.find((n) => n.data.label === "D");

  assert.ok(nodeA, "A exists");
  assert.ok(nodeD, "D exists");

  assert.strictEqual(elements.nodes.length, 2, "Should have 2 nodes");

  assert.ok(walked.threads.size >= 2, "Should have at least 2 threads");
});
