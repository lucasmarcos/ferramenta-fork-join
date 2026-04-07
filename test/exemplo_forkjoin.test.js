import assert from "node:assert";
import { test } from "node:test";
import { exampleForkJoin } from "../out/forkjoin/example.js";
import { parser } from "../out/forkjoin/parser.js";
import { resolve } from "../out/forkjoin/resolve.js";
import { treewalk } from "../out/forkjoin/treewalk.js";

test("exemplo.ts: exemploInicialForkJoin parses successfully", () => {
  const tree = parser.parse(exampleForkJoin);

  assert.ok(tree, "Should parse example code");
  assert.ok(!tree.cursor().type.isError, "Should not have parse errors");
});

test("exemplo.ts: exemploInicialForkJoin walks successfully", () => {
  const tree = parser.parse(exampleForkJoin);
  const walked = treewalk(exampleForkJoin, tree);

  assert.ok(walked, "Should walk example code");
  assert.ok(walked.threads, "Should have threads");
  assert.ok(walked.errors, "Should have errors array");

  const criticalErrors = walked.errors.filter((e) => e.severity === "error");
  assert.strictEqual(
    criticalErrors.length,
    0,
    "Should have no critical errors",
  );
});

test("exemplo.ts: exemploInicialForkJoin resolves to graph", () => {
  const tree = parser.parse(exampleForkJoin);
  const walked = treewalk(exampleForkJoin, tree);
  const elements = resolve(walked.threads);

  assert.ok(elements, "Should resolve to elements");

  assert.ok(Array.isArray(elements.nodes), "Should resolve to nodes array");
  assert.ok(Array.isArray(elements.edges), "Should resolve to edges array");

  assert.ok(elements.nodes.length > 0, "Should have nodes on graph");
  assert.ok(elements.edges.length > 0, "Should have edges on graph");
});

test("exemplo.ts: exemploInicialForkJoin has expected nodes", () => {
  const tree = parser.parse(exampleForkJoin);
  const walked = treewalk(exampleForkJoin, tree);
  const elements = resolve(walked.threads);

  const labels = elements.nodes.map((n) => n.data.label);

  assert.ok(labels.includes("C1"), "Should have node C1");
  assert.ok(labels.includes("C2"), "Should have node C2");
  assert.ok(labels.includes("C3"), "Should have node C3");
  assert.ok(labels.includes("C4"), "Should have node C4");

  assert.strictEqual(labels.length, 4, "Should have exactly 4 nodes");
});

test("exemplo.ts: exemploInicialForkJoin has correct structure", () => {
  const tree = parser.parse(exampleForkJoin);
  const walked = treewalk(exampleForkJoin, tree);

  assert.ok(walked.threads.has("0"), "Should have main thread");

  const mainThread = walked.threads.get("0");
  const hasFork = mainThread.some((cmd) => cmd.forkTo);
  assert.ok(hasFork, "Should have FORK in main thread");

  assert.ok(
    walked.threads.has("VAR_J"),
    "Should have VAR_J thread for synchronization",
  );

  const varJThread = walked.threads.get("VAR_J");
  assert.ok(varJThread.length > 0, "VAR_J thread should have commands");
  assert.ok(
    varJThread.some((cmd) => cmd.label === "C4"),
    "Should execute ROT_C4 block",
  );
});

test("exemplo.ts: exemploInicialForkJoin variable validation", () => {
  const tree = parser.parse(exampleForkJoin);
  const walked = treewalk(exampleForkJoin, tree);

  const varErrors = walked.errors.filter((e) =>
    e.message.includes("variável de controle"),
  );

  const criticalVarErrors = varErrors.filter((e) => e.severity === "error");
  assert.strictEqual(
    criticalVarErrors.length,
    0,
    "Variable count should be correct",
  );
});

test("exemplo.ts: exemploInicialForkJoin graph connectivity", () => {
  const tree = parser.parse(exampleForkJoin);
  const walked = treewalk(exampleForkJoin, tree);
  const elements = resolve(walked.threads);

  const c1Node = elements.nodes.find((n) => n.data.label === "C1");
  assert.ok(c1Node, "Should have C1 node");

  const c1Edges = elements.edges.filter(
    (e) => e.data.source === c1Node.data.id,
  );
  assert.strictEqual(
    c1Edges.length,
    2,
    "C1 should have 2 outgoing edges (fork)",
  );

  const c4Node = elements.nodes.find((n) => n.data.label === "C4");
  assert.ok(c4Node, "Should have C4 node");

  const c4Edges = elements.edges.filter(
    (e) => e.data.target === c4Node.data.id,
  );
  assert.strictEqual(
    c4Edges.length,
    2,
    "C4 should have 2 incoming edges (join)",
  );
});

test("exemplo.ts: exemploInicialForkJoin contains documentation comments", () => {
  assert.ok(exampleForkJoin.includes("//"), "Should contain comments");
  assert.ok(
    exampleForkJoin.includes("Bem-vindo"),
    "Should have Portuguese documentation",
  );

  const tree = parser.parse(exampleForkJoin);
  const walked = treewalk(exampleForkJoin, tree);

  const commentErrors = walked.errors.filter(
    (e) =>
      e.message.toLowerCase().includes("comentário") ||
      e.message.toLowerCase().includes("comment"),
  );

  assert.strictEqual(
    commentErrors.length,
    0,
    "Comments should not cause errors",
  );
});

test("exemplo.ts: exemploInicialForkJoin is valid educational example", () => {
  const tree = parser.parse(exampleForkJoin);
  const walked = treewalk(exampleForkJoin, tree);
  const elements = resolve(walked.threads);

  const parseErrors = walked.errors.filter(
    (e) => e.message.includes("sintaxe") || e.message.includes("syntax"),
  );
  assert.strictEqual(parseErrors.length, 0, "Should be syntactically valid");

  assert.ok(
    elements.nodes.length >= 3,
    "Should have multiple nodes to demonstrate parallelism",
  );

  assert.ok(walked.threads.has("VAR_J"), "Should demonstrate synchronization");

  assert.ok(
    elements.edges.length >= 3,
    "Should have enough edges for meaningful visualization",
  );
});
