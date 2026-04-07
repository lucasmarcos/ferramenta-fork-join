import assert from "node:assert";
import { test } from "node:test";
import { interpret } from "../out/parbeginparend/interpret.js";
import { stackify } from "../out/parbeginparend/stack.js";

test("stackify handles simple sequence", () => {
  const ir = ["[", "A", "B", "C", "]"];
  const stack = stackify(ir);

  assert.strictEqual(stack.type, "seq", "Root should be seq type");
  assert.ok(Array.isArray(stack.child), "Should have children");
  assert.strictEqual(stack.child.length, 3, "Should have 3 children");
});

test("stackify handles parallel block", () => {
  const ir = ["(", "A", "B", "C", ")"];
  const stack = stackify(ir);

  assert.strictEqual(stack.type, "par", "Root should be par type");
  assert.ok(Array.isArray(stack.child), "Should have children");
  assert.strictEqual(stack.child.length, 3, "Should have 3 parallel children");
});

test("stackify handles nested sequence and parallel", () => {
  const ir = ["[", "(", "A", "B", ")", "C", "]"];
  const stack = stackify(ir);

  assert.strictEqual(stack.type, "seq", "Root should be seq");
  assert.strictEqual(
    stack.child.length,
    2,
    "Should have 2 children: par block and C",
  );
  assert.strictEqual(stack.child[0].type, "par", "First child should be par");
});

test("stackify handles complex nested structure", () => {
  const ir = ["[", "(", "A", "[", "B", "C", "]", ")", "D", "]"];
  const stack = stackify(ir);

  assert.strictEqual(stack.type, "seq", "Root should be seq");
  assert.ok(stack.child[0].type === "par", "Should have parallel section");
});

test("interpret generates nodes for simple sequence", () => {
  const ir = ["[", "A", "B", "]"];
  const stack = stackify(ir);
  const elements = interpret(stack);

  assert.strictEqual(elements.nodes.length, 2, "Should generate 2 nodes");
  assert.ok(
    elements.nodes.some((n) => n.data.label === "A"),
    "Should have node A",
  );
  assert.ok(
    elements.nodes.some((n) => n.data.label === "B"),
    "Should have node B",
  );
});

test("interpret generates edges for sequence", () => {
  const ir = ["[", "A", "B", "]"];
  const stack = stackify(ir);
  const elements = interpret(stack);

  assert.strictEqual(elements.edges.length, 1, "Should have 1 edge A->B");
});

test("interpret handles parallel branches", () => {
  const ir = ["[", "(", "A", "B", ")", "C", "]"];
  const stack = stackify(ir);
  const elements = interpret(stack);

  assert.strictEqual(elements.nodes.length, 3, "Should have 3 nodes");

  const nodeC = elements.nodes.find((n) => n.data.label === "C");
  const edges = elements.edges.filter((e) => e.data.target === nodeC?.data.id);
  assert.strictEqual(edges.length, 2, "C should have edges from both A and B");
});

test("interpret handles deep nesting", () => {
  const ir = ["[", "[", "[", "A", "]", "]", "]"];
  const stack = stackify(ir);
  const elements = interpret(stack);

  assert.strictEqual(elements.nodes.length, 1, "Should have 1 node");
  assert.strictEqual(elements.nodes[0].data.label, "A");
});

test("interpret empty parallel block", () => {
  const ir = ["[", "(", ")", "A", "]"];
  const stack = stackify(ir);
  const elements = interpret(stack);
  assert.ok(Array.isArray(elements.nodes), "Should have nodes array");
  assert.ok(Array.isArray(elements.edges), "Should have edges array");
});

test("stackify single command", () => {
  const ir = ["A"];
  const stack = stackify(ir);

  assert.strictEqual(stack.type, "call", "Single command should be call type");
  assert.strictEqual(stack.label, "A", "Should have correct label");
  assert.ok(stack.id, "Should have generated UUID");
});

test("interpret preserves command IDs", () => {
  const ir = ["[", "TEST", "]"];
  const stack = stackify(ir);
  const elements = interpret(stack);

  assert.strictEqual(elements.nodes.length, 1, "Should have 1 node");
  assert.ok(elements.nodes[0].data.id, "Node should have ID");
  assert.strictEqual(
    elements.nodes[0].data.label,
    "TEST",
    "Node should have correct label",
  );
});

test("interpret complex parallel and sequential mix", () => {
  const ir = ["[", "(", "[", "A", "B", "]", "[", "C", "D", "]", ")", "E", "]"];
  const stack = stackify(ir);
  const elements = interpret(stack);

  assert.strictEqual(
    elements.nodes.length,
    5,
    "Should have 5 nodes: A, B, C, D, E",
  );

  assert.strictEqual(
    elements.edges.length,
    4,
    "Should have edges from A,B to E and C,D to E",
  );

  assert.ok(
    elements.nodes.find((e) => e.data.label === "A"),
    "Should have node A",
  );

  assert.ok(
    elements.nodes.find((e) => e.data.label === "B"),
    "Should have node B",
  );

  assert.ok(
    elements.nodes.find((e) => e.data.label === "C"),
    "Should have node C",
  );

  assert.ok(
    elements.nodes.find((e) => e.data.label === "D"),
    "Should have node D",
  );

  assert.ok(
    elements.nodes.find((e) => e.data.label === "E"),
    "Should have node E",
  );

  const nodeE = elements.nodes.find((n) => n.data.label === "E");
  const edgesToE = elements.edges.filter(
    (e) => e.data.target === nodeE?.data.id,
  );
  assert.strictEqual(edgesToE.length, 2, "E should have 2 incoming edges");
});

test("stackify handles mismatched brackets gracefully", () => {
  const ir = ["[", "A", ")"];
  const stack = stackify(ir);
  assert.ok(stack, "Should return some structure");
});
