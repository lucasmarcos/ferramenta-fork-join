import assert from "node:assert";
import { test } from "node:test";
import { parser } from "../out/forkJoinParser.js";
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

  const nodes = elements.filter((e) => !e.data.source);
  const edges = elements.filter((e) => e.data.source);

  console.log(
    "Nodes:",
    nodes.map((n) => n.data.label),
  );

  const nodeA = nodes.find((n) => n.data.label === "A");
  const nodeD = nodes.find((n) => n.data.label === "D");

  assert.ok(nodeA, "A exists");
  assert.ok(nodeD, "D exists");

  const edgeAD = edges.find(
    (e) => e.data.source === nodeA.data.id && e.data.target === nodeD.data.id,
  );
  assert.ok(edgeAD, "A -> D fork should exist even without QUIT");
});
