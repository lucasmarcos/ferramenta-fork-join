import assert from "node:assert";
import { test } from "node:test";
import { parser } from "../out/forkjoin/parser.js";
import { resolve } from "../out/forkjoin/resolve.js";
import { treewalk } from "../out/forkjoin/treewalk.js";

test("FORK branches correctly in the graph", () => {
  const code = `
A;
FORK ROT_D;
B;

ROT_D:
  D;
  QUIT;
  `;
  const tree = parser.parse(code);
  const walked = treewalk(code, tree);
  const elements = resolve(walked.threads);

  const nodeA = elements.nodes.find((n) => n.data.label === "A");
  const nodeB = elements.nodes.find((n) => n.data.label === "B");
  const nodeD = elements.nodes.find((n) => n.data.label === "D");

  assert.ok(nodeA, "Node A should exist");
  assert.ok(nodeB, "Node B should exist");
  assert.ok(nodeD, "Node D should exist");

  const edgeAForkD = elements.edges.find(
    (e) => e.data.source === nodeA.data.id && e.data.target === nodeD.data.id,
  );
  assert.ok(edgeAForkD, "There should be an edge from A to D (the FORK)");
});
