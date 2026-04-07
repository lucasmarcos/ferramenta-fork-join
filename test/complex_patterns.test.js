import assert from "node:assert";
import { test } from "node:test";
import { parser } from "../out/forkjoin/parser.js";
import { resolve } from "../out/forkjoin/resolve.js";
import { treewalk } from "../out/forkjoin/treewalk.js";

test("nested FORK creates multiple branches", () => {
  const code = `
A;
FORK B_LABEL;
C;
FORK D_LABEL;
E;

B_LABEL:
  B;
  QUIT;

D_LABEL:
  D;
  QUIT;
  `;
  const tree = parser.parse(code);
  const walked = treewalk(code, tree);
  const elements = resolve(walked.threads);

  const nodeLabels = elements.nodes.map((n) => n.data.label);

  assert.ok(nodeLabels.includes("A"), "Should have node A");
  assert.ok(nodeLabels.includes("B"), "Should have node B");
  assert.ok(nodeLabels.includes("C"), "Should have node C");
  assert.ok(nodeLabels.includes("D"), "Should have node D");
  assert.ok(nodeLabels.includes("E"), "Should have node E");
});

test("multiple FORK from same command", () => {
  const code = `
A;
FORK B_LABEL;
FORK C_LABEL;
D;

B_LABEL:
  B;
  QUIT;

C_LABEL:
  C;
  QUIT;
  `;
  const tree = parser.parse(code);
  const walked = treewalk(code, tree);
  const elements = resolve(walked.threads);

  assert.ok(
    elements.nodes.some((n) => n.data.label === "B"),
    "Should have forked to B",
  );
  assert.ok(
    elements.nodes.some((n) => n.data.label === "C"),
    "Should have forked to C",
  );
  assert.ok(
    elements.nodes.some((n) => n.data.label === "D"),
    "Should have D in main thread",
  );
});

test("join basic case", () => {
  const code = `
    VAR_C = 2;

    A;
    FORK ROT_B;
    JOIN VAR_C, ROT_C, QUIT;

    ROT_B:
      B;
      JOIN VAR_C, ROT_C, QUIT;

    ROT_C:
      C;
  `;

  const tree = parser.parse(code);
  const walked = treewalk(code, tree);
  const elements = resolve(walked.threads);

  assert.ok(elements.nodes.length > 0, "Should have some nodes");
});

test("complex pattern with multiple forks and joins", () => {
  const code = `
VAR_BARRIER = 3;

START;
FORK T1;
FORK T2;
MAIN_WORK;
JOIN VAR_BARRIER, BARRIER, QUIT;

T1:
  T1_WORK;
  JOIN VAR_BARRIER, BARRIER, QUIT;

T2:
  T2_WORK;
  JOIN VAR_BARRIER, BARRIER, QUIT;

BARRIER:
  FINAL;
`;

  const tree = parser.parse(code);
  const walked = treewalk(code, tree);

  const elements = resolve(walked.threads);

  assert.ok(
    elements.nodes.some((n) => n.data.label === "START"),
    "Should have START",
  );
  assert.ok(
    elements.nodes.some((n) => n.data.label === "T1_WORK"),
    "Should have T1_WORK",
  );
  assert.ok(
    elements.nodes.some((n) => n.data.label === "T2_WORK"),
    "Should have T2_WORK",
  );
  assert.ok(
    elements.nodes.some((n) => n.data.label === "FINAL"),
    "Should have FINAL",
  );
});

test("sequential commands in thread", () => {
  const code = `
A;
B;
C;
D;
QUIT;
  `;
  const tree = parser.parse(code);
  const walked = treewalk(code, tree);
  const elements = resolve(walked.threads);

  assert.strictEqual(elements.nodes.length, 4, "Should have 4 nodes");
  assert.strictEqual(elements.edges.length, 3, "Should have 3 edges");
});

test("QUIT terminates thread", () => {
  const code = `
A;
FORK B_LABEL;
MAIN;
QUIT;

B_LABEL:
  B;
  QUIT;
  `;
  const tree = parser.parse(code);
  const walked = treewalk(code, tree);
  const elements = resolve(walked.threads);

  assert.ok(Array.isArray(elements.nodes), "Should resolve to elements array");
  assert.ok(elements.nodes.length > 0, "Should have at least some elements");
});

test("empty label block", () => {
  const code = `
A;
FORK EMPTY;
B;
QUIT;

EMPTY:
  QUIT;
  `;
  const tree = parser.parse(code);
  const walked = treewalk(code, tree);
  assert.strictEqual(
    walked.errors.length,
    0,
    "Empty block should not cause errors",
  );
});

test("thread with single command", () => {
  const code = `
ONLY_ONE;
QUIT;
  `;
  const tree = parser.parse(code);
  const walked = treewalk(code, tree);
  const elements = resolve(walked.threads);

  assert.strictEqual(elements.nodes.length, 1, "Should have exactly one node");
  assert.strictEqual(elements.nodes[0].data.label, "ONLY_ONE");
});
