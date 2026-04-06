import { test } from "node:test";
import assert from "node:assert";
import { parser } from "../out/forkJoinParser.js";
import { treewalk } from "../out/forkjoin/treewalk.js";
import { resolve } from "../out/forkjoin/resolve.js";

test("resolve creates correct edge connections", () => {
  const code = `
A;
B;
C;
QUIT;
  `;
  const tree = parser.parse(code);
  const walked = treewalk(code, tree);
  const elements = resolve(walked.threads);
  
  const nodes = elements.filter(e => e.data.id && e.data.label);
  const edges = elements.filter(e => e.data.source && e.data.target);
  
  // Should have edges A->B and B->C
  assert.strictEqual(edges.length, 2, "Should have 2 edges for 3 sequential nodes");
});

test("resolve handles fork with join synchronization", () => {
  // JOIN requires control variables in current implementation
  const code = `
VAR_SYNC = 2;

A;
FORK WORKER;
MAIN;
JOIN VAR_SYNC, SYNC, QUIT;

WORKER:
  WORK;
  JOIN VAR_SYNC, SYNC, QUIT;

SYNC:
  FINAL;
  `;
  const tree = parser.parse(code);
  const walked = treewalk(code, tree);
  const elements = resolve(walked.threads);
  
  const nodes = elements.filter(e => e.data.id && e.data.label);
  const finalNode = nodes.find(n => n.data.label === "FINAL");
  
  assert.ok(finalNode, "Should have FINAL node as sync point");
});

test("resolve assigns correct shapes to nodes", () => {
  const code = `
AB;
XYZ;
VERYLONGNAME;
QUIT;
  `;
  const tree = parser.parse(code);
  const walked = treewalk(code, tree);
  const elements = resolve(walked.threads);
  
  const nodes = elements.filter(e => e.data.id && e.data.label);
  
  // Labels <= 2 chars should get ellipse, others round-rectangle
  const shortNode = nodes.find(n => n.data.label === "AB");
  const longNode = nodes.find(n => n.data.label === "VERYLONGNAME");
  
  assert.strictEqual(shortNode?.data.shape, "ellipse", "Short labels should be ellipse");
  assert.strictEqual(longNode?.data.shape, "round-rectangle", "Long labels should be round-rectangle");
});

test("resolve handles thread with only QUIT", () => {
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
  const elements = resolve(walked.threads);
  
  // Should handle thread with no actual work
  assert.ok(Array.isArray(elements));
});

test("resolve with circular reference attempt", () => {
  const code = `
A;
FORK B_LABEL;
QUIT;

B_LABEL:
  B;
  FORK A_LABEL;
  QUIT;

A_LABEL:
  C;
  QUIT;
  `;
  const tree = parser.parse(code);
  const walked = treewalk(code, tree);
  const elements = resolve(walked.threads);
  
  // Should handle without infinite loop
  assert.ok(Array.isArray(elements));
  assert.ok(elements.length > 0);
});

test("resolve maintains thread independence", () => {
  const code = `
A;
FORK T1;
FORK T2;
MAIN;
QUIT;

T1:
  X;
  QUIT;

T2:
  Y;
  QUIT;
  `;
  const tree = parser.parse(code);
  const walked = treewalk(code, tree);
  const elements = resolve(walked.threads);
  
  const nodes = elements.filter(e => e.data.id && e.data.label);
  
  assert.ok(nodes.some(n => n.data.label === "X"), "T1 should have X");
  assert.ok(nodes.some(n => n.data.label === "Y"), "T2 should have Y");
  assert.ok(nodes.some(n => n.data.label === "MAIN"), "Main thread should continue");
});

test("resolve generates unique IDs for all nodes", () => {
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
  
  const nodes = elements.filter(e => e.data.id && e.data.label);
  const ids = nodes.map(n => n.data.id);
  const uniqueIds = new Set(ids);
  
  assert.strictEqual(ids.length, uniqueIds.size, "All node IDs should be unique");
});

test("resolve handles alternating fork and join", () => {
  // Complex multi-stage JOIN patterns with control variables
  const code = `
VAR_SYNC1 = 2;
VAR_SYNC2 = 2;

A;
FORK B_LABEL;
JOIN VAR_SYNC1, SYNC1, QUIT;

B_LABEL:
  B;
  JOIN VAR_SYNC1, SYNC1, QUIT;

SYNC1:
  C;
  FORK D_LABEL;
  JOIN VAR_SYNC2, SYNC2, QUIT;

D_LABEL:
  D;
  JOIN VAR_SYNC2, SYNC2, QUIT;

SYNC2:
  E;
  `;
  const tree = parser.parse(code);
  const walked = treewalk(code, tree);
  const elements = resolve(walked.threads);
  
  const nodes = elements.filter(e => e.data.id && e.data.label);
  const labels = nodes.map(n => n.data.label);
  
  assert.ok(labels.includes("A"), "Should have A");
  assert.ok(labels.includes("B"), "Should have B");
  assert.ok(labels.includes("C"), "Should have C");
  assert.ok(labels.includes("D"), "Should have D");
  assert.ok(labels.includes("E"), "Should have E");
});

test("resolve with command that has no connections", () => {
  const threads = new Map();
  threads.set("0", [
    { id: "1", label: "ISOLATED", forks: [], joins: [] }
  ]);
  
  const elements = resolve(threads);
  const nodes = elements.filter(e => e.data.id && e.data.label);
  
  assert.strictEqual(nodes.length, 1);
  assert.strictEqual(nodes[0].data.label, "ISOLATED");
});

test("resolve handles thread that joins immediately", () => {
  const code = `
A;
FORK WORKER;
MAIN;
JOIN SYNC;

WORKER:
  JOIN SYNC;

SYNC:
  FINAL;
  QUIT;
  `;
  const tree = parser.parse(code);
  const walked = treewalk(code, tree);
  const elements = resolve(walked.threads);
  
  // Worker thread joins immediately without doing work
  assert.ok(Array.isArray(elements));
});
