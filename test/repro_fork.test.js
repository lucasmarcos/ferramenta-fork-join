import { test } from "node:test";
import assert from "node:assert";
import { parser } from "../out/forkJoinParser.js";
import { treewalk } from "../out/forkjoin/treewalk.js";
import { resolve } from "../out/forkjoin/resolve.js";

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

  // We expect:
  // 1. A node for A
  // 2. A node for B
  // 3. A node for D
  // 4. Edge A -> B
  // 5. Edge A -> D (The Fork)

  const nodes = elements.filter(e => !e.data.source);
  const edges = elements.filter(e => e.data.source);

  console.log("Nodes:", nodes.map(n => n.data.label));
  console.log("Edges:", edges.map(e => `${e.data.source} -> ${e.data.target}`));

  const nodeA = nodes.find(n => n.data.label === "A");
  const nodeB = nodes.find(n => n.data.label === "B");
  const nodeD = nodes.find(n => n.data.label === "D");

  assert.ok(nodeA, "Node A should exist");
  assert.ok(nodeB, "Node B should exist");
  assert.ok(nodeD, "Node D should exist");

  const edgeAForkD = edges.find(e => e.data.source === nodeA.data.id && e.data.target === nodeD.data.id);
  assert.ok(edgeAForkD, "There should be an edge from A to D (the FORK)");
});
