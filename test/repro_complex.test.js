import { test } from "node:test";
import assert from "node:assert";
import { parser } from "../out/forkJoinParser.js";
import { treewalk } from "../out/forkjoin/treewalk.js";
import { resolve } from "../out/forkjoin/resolve.js";

test("User's complex FORK example", () => {
  const code = `
A;
B;
C;
FORK ROT_D;
FORK ROT_G;
H;

ROT_D:
  D;
  QUIT;

ROT_G:
  G;
  QUIT;
  `;
  const tree = parser.parse(code);
  const walked = treewalk(code, tree);
  const elements = resolve(walked.threads);

  const nodes = elements.filter(e => !e.data.source);
  const edges = elements.filter(e => e.data.source);

  console.log("Nodes:", nodes.map(n => n.data.label));
  
  const nodeC = nodes.find(n => n.data.label === "C");
  const nodeD = nodes.find(n => n.data.label === "D");
  const nodeG = nodes.find(n => n.data.label === "G");
  const nodeH = nodes.find(n => n.data.label === "H");

  assert.ok(nodeC, "C exists");
  assert.ok(nodeD, "D exists");
  assert.ok(nodeG, "G exists");
  assert.ok(nodeH, "H exists");

  const edgeCD = edges.find(e => e.data.source === nodeC.data.id && e.data.target === nodeD.data.id);
  const edgeCG = edges.find(e => e.data.source === nodeC.data.id && e.data.target === nodeG.data.id);
  const edgeCH = edges.find(e => e.data.source === nodeC.data.id && e.data.target === nodeH.data.id);

  assert.ok(edgeCD, "C -> D fork exists");
  assert.ok(edgeCG, "C -> G fork exists");
  assert.ok(edgeCH, "C -> H main line exists");
});
