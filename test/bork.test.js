import assert from "node:assert";
import { test } from "node:test";
import { parser } from "../out/forkjoin/parser.js";
import { resolve } from "../out/forkjoin/resolve.js";
import { treewalk } from "../out/forkjoin/treewalk.js";

test("borked", () => {
  const code = `
    VAR_H = 3;
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

  const tree = parser.parse(code);
  const walked = treewalk(code, tree);
  const elements = resolve(walked.threads);
  const countByLabel = (label) =>
    elements.nodes.filter((n) => n.data.label === label).length;
  const hasEdge = (sourceLabel, targetLabel) => {
    const source = elements.nodes.find((n) => n.data.label === sourceLabel);
    const target = elements.nodes.find((n) => n.data.label === targetLabel);

    return elements.edges.some(
      (e) =>
        e.data.source === source?.data.id && e.data.target === target?.data.id,
    );
  };
  const countIncoming = (targetLabel) => {
    const target = elements.nodes.find((n) => n.data.label === targetLabel);
    return elements.edges.filter((e) => e.data.target === target?.data.id)
      .length;
  };
  const countOutgoing = (sourceLabel) => {
    const source = elements.nodes.find((n) => n.data.label === sourceLabel);
    return elements.edges.filter((e) => e.data.source === source?.data.id)
      .length;
  };

  const nodeD = elements.nodes.find((n) => n.data.label === "D");

  assert.strictEqual(
    walked.errors.length,
    0,
    "Should have no validation errors",
  );
  assert.ok(nodeD, "D exists");
  for (const label of ["A", "B", "C", "D", "E", "F", "G", "H"]) {
    assert.strictEqual(
      countByLabel(label),
      1,
      `Should have exactly one ${label}`,
    );
  }

  assert.strictEqual(elements.nodes.length, 8, "Should have 8 nodes");
  assert.strictEqual(elements.edges.length, 10, "Should have 10 edges");

  assert.ok(hasEdge("A", "C"), "Should have edge A -> C");
  assert.ok(hasEdge("A", "D"), "Should have edge A -> D");
  assert.ok(hasEdge("B", "D"), "Should have edge B -> D");
  assert.ok(hasEdge("C", "D"), "Should have edge C -> D");
  assert.strictEqual(
    countIncoming("D"),
    3,
    "D should have exactly 3 incoming edges",
  );

  assert.ok(hasEdge("D", "E"), "Should have edge D -> E");
  assert.ok(hasEdge("D", "G"), "Should have edge D -> G");
  assert.ok(hasEdge("D", "F"), "Should have edge D -> F");
  assert.strictEqual(
    countOutgoing("D"),
    3,
    "D should have exactly 3 outgoing edges",
  );

  assert.ok(hasEdge("E", "H"), "Should have edge E -> H");
  assert.ok(hasEdge("F", "H"), "Should have edge F -> H");
  assert.ok(hasEdge("G", "H"), "Should have edge G -> H");
  assert.strictEqual(
    countIncoming("H"),
    3,
    "H should have exactly 3 incoming edges",
  );
});
