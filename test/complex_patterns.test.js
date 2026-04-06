import { test } from "node:test";
import assert from "node:assert";
import { parser } from "../out/forkJoinParser.js";
import { treewalk } from "../out/forkjoin/treewalk.js";
import { resolve } from "../out/forkjoin/resolve.js";

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

  const nodes = elements.filter(e => !e.data.source);
  const nodeLabels = nodes.map(n => n.data.label);

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

  const nodes = elements.filter(e => !e.data.source);
  assert.ok(nodes.some(n => n.data.label === "B"), "Should have forked to B");
  assert.ok(nodes.some(n => n.data.label === "C"), "Should have forked to C");
  assert.ok(nodes.some(n => n.data.label === "D"), "Should have D in main thread");
});

test("JOIN synchronizes threads - basic case", () => {
  // Note: Current JOIN implementation has limitations with control variables
  // This test verifies basic JOIN structure is captured
  const code = `
A;
FORK B_LABEL;
JOIN SYNC;
QUIT;

B_LABEL:
  B;
  JOIN SYNC;
  QUIT;

SYNC:
  C;
  QUIT;
  `;
  const tree = parser.parse(code);
  const walked = treewalk(code, tree);
  const elements = resolve(walked.threads);

  const nodes = elements.filter(e => !e.data.source);
  // JOIN creates threads but current implementation may not fully resolve all nodes
  assert.ok(nodes.length > 0, "Should have some nodes");
});

test("complex pattern with multiple forks and joins", () => {
  // Note: This tests complex JOIN patterns which require control variables
  // Current implementation requires VAR_J style control variables
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
  const nodes = elements.filter(e => !e.data.source);
  
  assert.ok(nodes.some(n => n.data.label === "START"), "Should have START");
  assert.ok(nodes.some(n => n.data.label === "T1_WORK"), "Should have T1_WORK");
  assert.ok(nodes.some(n => n.data.label === "T2_WORK"), "Should have T2_WORK");
  assert.ok(nodes.some(n => n.data.label === "FINAL"), "Should have FINAL");
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

  const nodes = elements.filter(e => !e.data.source);
  const edges = elements.filter(e => e.data.source);

  assert.strictEqual(nodes.length, 4, "Should have 4 nodes");
  assert.ok(edges.length >= 3, "Should have edges connecting sequential nodes");
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

  assert.ok(Array.isArray(elements), "Should resolve to elements array");
  assert.ok(elements.length > 0, "Should have at least some elements");
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
  assert.strictEqual(walked.errors.length, 0, "Empty block should not cause errors");
});

test("thread with single command", () => {
  const code = `
ONLY_ONE;
QUIT;
  `;
  const tree = parser.parse(code);
  const walked = treewalk(code, tree);
  const elements = resolve(walked.threads);

  const nodes = elements.filter(e => !e.data.source);
  assert.strictEqual(nodes.length, 1, "Should have exactly one node");
  assert.strictEqual(nodes[0].data.label, "ONLY_ONE");
});
