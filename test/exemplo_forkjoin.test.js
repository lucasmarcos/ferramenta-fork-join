import assert from "node:assert";
import { test } from "node:test";
import { parser } from "../out/forkJoinParser.js";
import { exampleForkJoin } from "../out/forkjoin/example.js";
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

  assert.ok(Array.isArray(elements), "Should resolve to elements array");
  assert.ok(elements.length > 0, "Should have graph elements");

  const nodes = elements.filter((e) => e.data.id && e.data.label);
  const edges = elements.filter((e) => e.data.source && e.data.target);

  assert.ok(nodes.length > 0, "Should have nodes");
  assert.ok(edges.length > 0, "Should have edges");
});

test("exemplo.ts: exemploInicialForkJoin has expected nodes", () => {
  const tree = parser.parse(exampleForkJoin);
  const walked = treewalk(exampleForkJoin, tree);
  const elements = resolve(walked.threads);

  const nodes = elements.filter((e) => e.data.id && e.data.label);
  const labels = nodes.map((n) => n.data.label);

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

  const nodes = elements.filter((e) => e.data.id && e.data.label);
  const edges = elements.filter((e) => e.data.source && e.data.target);

  const c1Node = nodes.find((n) => n.data.label === "C1");
  assert.ok(c1Node, "Should have C1 node");

  const c1Edges = edges.filter((e) => e.data.source === c1Node.data.id);
  assert.strictEqual(
    c1Edges.length,
    2,
    "C1 should have 2 outgoing edges (fork)",
  );

  const c4Node = nodes.find((n) => n.data.label === "C4");
  assert.ok(c4Node, "Should have C4 node");

  const c4Edges = edges.filter((e) => e.data.target === c4Node.data.id);
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

  const nodes = elements.filter((e) => e.data.id && e.data.label);
  assert.ok(
    nodes.length >= 3,
    "Should have multiple nodes to demonstrate parallelism",
  );

  assert.ok(walked.threads.has("VAR_J"), "Should demonstrate synchronization");

  const edges = elements.filter((e) => e.data.source && e.data.target);
  assert.ok(
    edges.length >= 3,
    "Should have enough edges for meaningful visualization",
  );
});
