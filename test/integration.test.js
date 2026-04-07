import assert from "node:assert";
import { test } from "node:test";
import { parser } from "../out/forkJoinParser.js";
import { resolve } from "../out/forkjoin/resolve.js";
import { treewalk } from "../out/forkjoin/treewalk.js";

test("INTEGRATION: Simple sequential program", () => {
  const code = `
A;
B;
C;
QUIT;
`;

  const tree = parser.parse(code);
  assert.ok(tree, "Parser should return tree");

  const walked = treewalk(code, tree);
  assert.strictEqual(walked.errors.length, 0, "Should have no errors");
  assert.ok(walked.threads.has("0"), "Should have main thread");
  assert.strictEqual(
    walked.threads.get("0").length,
    3,
    "Should have 3 commands",
  );

  const elements = resolve(walked.threads);
  const nodes = elements.filter((e) => e.data.id && e.data.label);
  const edges = elements.filter((e) => e.data.source && e.data.target);

  assert.strictEqual(nodes.length, 3, "Should resolve to 3 nodes");
  assert.strictEqual(edges.length, 2, "Should have 2 edges (A->B, B->C)");
});

test("INTEGRATION: FORK creates parallel execution", () => {
  const code = `
MAIN1;
FORK BRANCH;
MAIN2;
QUIT;

BRANCH:
  WORK;
  QUIT;
`;

  const tree = parser.parse(code);
  const walked = treewalk(code, tree);

  assert.ok(walked.threads.size >= 2, "Should have at least 2 threads");

  const mainThread = walked.threads.get("0");
  const hasFork = mainThread.some((cmd) => cmd.forkTo);
  assert.ok(hasFork, "Main thread should have fork");

  const elements = resolve(walked.threads);
  const nodes = elements.filter((e) => e.data.id && e.data.label);

  assert.ok(
    nodes.some((n) => n.data.label === "MAIN1"),
    "Should have MAIN1",
  );
  assert.ok(
    nodes.some((n) => n.data.label === "MAIN2"),
    "Should have MAIN2",
  );
  assert.ok(
    nodes.some((n) => n.data.label === "WORK"),
    "Should have WORK",
  );

  const edges = elements.filter((e) => e.data.source && e.data.target);
  const main1Node = nodes.find((n) => n.data.label === "MAIN1");
  const main1Edges = edges.filter((e) => e.data.source === main1Node.data.id);

  assert.strictEqual(main1Edges.length, 2, "MAIN1 should fork to 2 nodes");
});

test("INTEGRATION: JOIN synchronizes threads", () => {
  const code = `VAR_J = 2;

START;
FORK T1;
MAIN_WORK;
JOIN VAR_J, SYNC, QUIT;

T1:
  BRANCH_WORK;
  JOIN VAR_J, SYNC, QUIT;

SYNC:
  AFTER_SYNC;
`;

  const tree = parser.parse(code);
  const walked = treewalk(code, tree);

  assert.ok(walked.threads.size >= 3, "Should have at least 3 threads");
  assert.ok(walked.threads.has("VAR_J"), "Should have sync thread");

  const elements = resolve(walked.threads);
  const nodes = elements.filter((e) => e.data.id && e.data.label);
  const labels = nodes.map((n) => n.data.label);

  assert.ok(labels.includes("START"), "Should have START");
  assert.ok(labels.includes("MAIN_WORK"), "Should have MAIN_WORK");
  assert.ok(labels.includes("BRANCH_WORK"), "Should have BRANCH_WORK");
  assert.ok(labels.includes("AFTER_SYNC"), "Should have AFTER_SYNC");

  const syncNode = nodes.find((n) => n.data.label === "AFTER_SYNC");
  const edges = elements.filter((e) => e.data.source && e.data.target);
  const syncEdges = edges.filter((e) => e.data.target === syncNode?.data.id);

  assert.strictEqual(
    syncEdges.length,
    2,
    "Sync point should have 2 incoming edges",
  );
});

test("INTEGRATION: Complex nested pattern", () => {
  const code = `VAR_A = 2;
VAR_B = 2;

INIT;
FORK P1;
FORK P2;
MIDDLE;
JOIN VAR_A, SYNC_A, QUIT;

P1:
  P1_WORK;
  JOIN VAR_A, SYNC_A, QUIT;

P2:
  P2_WORK;
  JOIN VAR_A, SYNC_A, QUIT;

SYNC_A:
  AFTER_A;
  FORK Q1;
  MORE_WORK;
  JOIN VAR_B, SYNC_B, QUIT;

Q1:
  Q1_WORK;
  JOIN VAR_B, SYNC_B, QUIT;

SYNC_B:
  FINAL;
`;

  const tree = parser.parse(code);
  const walked = treewalk(code, tree);
  const elements = resolve(walked.threads);

  const nodes = elements.filter((e) => e.data.id && e.data.label);
  const labels = nodes.map((n) => n.data.label);

  const expectedNodes = [
    "INIT",
    "MIDDLE",
    "P1_WORK",
    "P2_WORK",
    "AFTER_A",
    "MORE_WORK",
    "Q1_WORK",
    "FINAL",
  ];

  for (const expected of expectedNodes) {
    assert.ok(labels.includes(expected), `Should have node ${expected}`);
  }
});

test("INTEGRATION: Error detection in pipeline", () => {
  const code = `
FORK;  // Missing label - syntax error
A;
QUIT;
`;

  const tree = parser.parse(code);
  const walked = treewalk(code, tree);

  assert.ok(walked.errors.length > 0, "Should detect FORK without label");
});

test("INTEGRATION: Variable definition and usage", () => {
  const code = `VAR_TEST = 2;

A;
FORK B_LABEL;
MAIN;
JOIN VAR_TEST, SYNC, QUIT;

B_LABEL:
  B;
  JOIN VAR_TEST, SYNC, QUIT;

SYNC:
  C;
`;

  const tree = parser.parse(code);
  const walked = treewalk(code, tree);

  const countMismatch = walked.errors.find((e) =>
    e.message.includes("não corresponde ao número de JOINs"),
  );

  assert.ok(
    !countMismatch || walked.errors.length === 0,
    "Correct variable count should not produce error",
  );
});

test("INTEGRATION: Full example from documentation", () => {
  const code = `VAR_J = 2;

C1;
FORK ROT_C3;
C2;
JOIN VAR_J, ROT_C4, QUIT;

ROT_C3:
  C3;
  JOIN VAR_J, ROT_C4, QUIT;

ROT_C4:
  C4;
`;

  const tree = parser.parse(code);
  const walked = treewalk(code, tree);
  const elements = resolve(walked.threads);

  const nodes = elements.filter((e) => e.data.id && e.data.label);
  const labels = nodes.map((n) => n.data.label);

  assert.strictEqual(labels.length, 4, "Should have exactly 4 nodes");
  assert.ok(labels.includes("C1"), "Should have C1");
  assert.ok(labels.includes("C2"), "Should have C2");
  assert.ok(labels.includes("C3"), "Should have C3");
  assert.ok(labels.includes("C4"), "Should have C4");

  const edges = elements.filter((e) => e.data.source && e.data.target);
  assert.ok(edges.length > 0, "Should have edges connecting nodes");
});
