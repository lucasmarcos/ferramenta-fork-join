import assert from "node:assert";
import { test } from "node:test";
import { parser } from "../out/forkjoin/parser.js";
import { resolve } from "../out/forkjoin/resolve.js";
import { treewalk } from "../out/forkjoin/treewalk.js";

test("FORK without QUIT in blocks", () => {
  const code = `
A;
FORK ROT_D;
B;

ROT_D:
  D;
  `;
  const tree = parser.parse(code);
  const walked = treewalk(code, tree);
  const elements = resolve(walked.threads);

  const nodeA = elements.nodes.find((n) => n.data.label === "A");
  const nodeD = elements.nodes.find((n) => n.data.label === "D");

  assert.ok(nodeA, "A exists");
  assert.ok(nodeD, "D exists");

  const edgeAD = elements.edges.find(
    (e) => e.data.source === nodeA.data.id && e.data.target === nodeD.data.id,
  );
  assert.ok(edgeAD, "A -> D fork should exist even without QUIT");
});
