import assert from "node:assert";
import { test } from "node:test";
import { parser } from "../out/forkjoin/parser.js";
import { resolve } from "../out/forkjoin/resolve.js";
import { treewalk } from "../out/forkjoin/treewalk.js";

const code = `
VAR_H = 6;
VAR_D = 3;

FORK ROT_A;
B;
JOIN VAR_D, ROT_D, QUIT;

ROT_A:
  A;
  FORK ROT_C;
  JOIN VAR_D, ROT_D, QUIT;

ROT_D:
  D;
  FORK ROT_E;
  FORK ROT_G;
  F;
  JOIN VAR_H, ROT_H, QUIT;

ROT_C:
  C;
  JOIN VAR_D, ROT_D, QUIT;

ROT_E:
  E;
  JOIN VAR_H, ROT_H, QUIT;

ROT_G:
  G;
  JOIN VAR_H, ROT_H, QUIT;

ROT_H:
  H;
`;

test("borked", () => {
  const tree = parser.parse(code);
  const walked = treewalk(code, tree);
  const elements = resolve(walked.threads);

  const nodeD = elements.nodes.find((n) => n.data.label === "D");
  const nodeE = elements.nodes.find((n) => n.data.label === "E");
  const nodeG = elements.nodes.find((n) => n.data.label === "G");

  assert.ok(nodeD, "D exists");
  assert.ok(nodeE, "E exists");
  assert.ok(nodeG, "G exists");

  const edgeDE = elements.edges.find(
    (e) => e.data.source === nodeD.data.id && e.data.target === nodeE.data.id,
  );
  const edgeDG = elements.edges.find(
    (e) => e.data.source === nodeD.data.id && e.data.target === nodeG.data.id,
  );

  assert.ok(edgeDE, "should have edge d -> e");
  assert.ok(edgeDG, "should have edge d -> g");
});
