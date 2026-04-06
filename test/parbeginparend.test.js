import { test } from "node:test";
import assert from "node:assert";
import { stackify } from "../out/parbeginparend/stack.js";
import { interpret } from "../out/parbeginparend/interpret.js";

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
  assert.strictEqual(stack.child.length, 2, "Should have 2 children: par block and C");
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
  
  const nodes = elements.filter(e => e.data.id && e.data.label);
  assert.strictEqual(nodes.length, 2, "Should generate 2 nodes");
  assert.ok(nodes.some(n => n.data.label === "A"), "Should have node A");
  assert.ok(nodes.some(n => n.data.label === "B"), "Should have node B");
});

test("interpret generates edges for sequence", () => {
  const ir = ["[", "A", "B", "]"];
  const stack = stackify(ir);
  const elements = interpret(stack);
  
  const edges = elements.filter(e => e.data.source && e.data.target);
  assert.strictEqual(edges.length, 1, "Should have 1 edge A->B");
});

test("interpret handles parallel branches", () => {
  const ir = ["[", "(", "A", "B", ")", "C", "]"];
  const stack = stackify(ir);
  const elements = interpret(stack);
  
  const nodes = elements.filter(e => e.data.id && e.data.label);
  assert.strictEqual(nodes.length, 3, "Should have 3 nodes");
  
  const nodeC = nodes.find(n => n.data.label === "C");
  const edges = elements.filter(e => e.data.target === nodeC?.data.id);
  assert.strictEqual(edges.length, 2, "C should have edges from both A and B");
});

test("interpret handles deep nesting", () => {
  const ir = ["[", "[", "[", "A", "]", "]", "]"];
  const stack = stackify(ir);
  const elements = interpret(stack);
  
  const nodes = elements.filter(e => e.data.id && e.data.label);
  assert.strictEqual(nodes.length, 1, "Should have 1 node");
  assert.strictEqual(nodes[0].data.label, "A");
});

test("interpret empty parallel block", () => {
  const ir = ["[", "(", ")", "A", "]"];
  const stack = stackify(ir);
  const elements = interpret(stack);
  
  // Should handle gracefully
  assert.ok(Array.isArray(elements), "Should return array");
});

test("stackify single command", () => {
  const ir = ["A"];
  const stack = stackify(ir);
  
  assert.strictEqual(stack.type, "call", "Single command should be call type");
  assert.strictEqual(stack.label, "A");
  assert.ok(stack.id, "Should have generated UUID");
});

test("interpret preserves command IDs", () => {
  const ir = ["[", "TEST", "]"];
  const stack = stackify(ir);
  const elements = interpret(stack);
  
  const nodes = elements.filter(e => e.data.id && e.data.label);
  assert.strictEqual(nodes.length, 1);
  assert.ok(nodes[0].data.id, "Node should have ID");
  assert.strictEqual(nodes[0].data.label, "TEST");
});

test("interpret complex parallel and sequential mix", () => {
  const ir = ["[", "(", "[", "A", "B", "]", "[", "C", "D", "]", ")", "E", "]"];
  const stack = stackify(ir);
  const elements = interpret(stack);
  
  const nodes = elements.filter(e => e.data.id && e.data.label);
  assert.strictEqual(nodes.length, 5, "Should have 5 nodes: A, B, C, D, E");
  
  // E should be connected to both branches
  const nodeE = nodes.find(n => n.data.label === "E");
  const edgesToE = elements.filter(e => e.data.target === nodeE?.data.id);
  assert.strictEqual(edgesToE.length, 2, "E should have 2 incoming edges");
});

test("stackify handles mismatched brackets gracefully", () => {
  const ir = ["[", "A", ")"];
  const stack = stackify(ir);
  
  // Should not crash, even if structure is invalid
  assert.ok(stack, "Should return some structure");
});
