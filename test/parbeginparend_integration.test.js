import assert from "node:assert";
import { test } from "node:test";
import { exampleParbeginParend } from "../out/parbeginparend/example.js";
import { interpret } from "../out/parbeginparend/interpret.js";
import { parse } from "../out/parbeginparend/ir.js";
import { parser } from "../out/parbeginparend/parser.js";
import { stackify } from "../out/parbeginparend/stack.js";

const compile = (code) => {
  const tree = parser.parse(code);
  const ir = parse(code, tree);
  const stack = stackify(ir);
  const elements = interpret(stack);

  return { tree, ir, stack, elements };
};

const edgePairs = (elements) =>
  elements.edges.map((edge) => {
    const source = elements.nodes.find(
      (node) => node.data.id === edge.data.source,
    );
    const target = elements.nodes.find(
      (node) => node.data.id === edge.data.target,
    );

    return [source?.data.label, target?.data.label];
  });

const countByLabel = (elements, label) =>
  elements.nodes.filter((node) => node.data.label === label).length;

const hasEdge = (elements, sourceLabel, targetLabel) =>
  edgePairs(elements).some(
    ([source, target]) => source === sourceLabel && target === targetLabel,
  );

test("parbegin/parend integration: sequential program compiles to a chain", () => {
  const { ir, elements } = compile(`BEGIN
  A;
  B;
  C;
END`);

  assert.deepStrictEqual(
    ir,
    ["[", "A", "B", "C", "]"],
    "IR should preserve sequence",
  );
  assert.deepStrictEqual(
    elements.nodes.map((node) => node.data.label),
    ["A", "B", "C"],
    "Should create nodes in order",
  );
  assert.deepStrictEqual(
    edgePairs(elements),
    [
      ["A", "B"],
      ["B", "C"],
    ],
    "Should create A -> B -> C",
  );
});

test("parbegin/parend integration: example program has exact fork/join shape", () => {
  const { ir, elements } = compile(exampleParbeginParend);

  assert.deepStrictEqual(
    ir,
    ["[", "A", "(", "[", "B", "C", "]", "[", "D", "E", "]", ")", "F", "]"],
    "Example IR should match the documented structure",
  );

  for (const label of ["A", "B", "C", "D", "E", "F"]) {
    assert.strictEqual(
      countByLabel(elements, label),
      1,
      `Should have one ${label}`,
    );
  }

  assert.strictEqual(elements.nodes.length, 6, "Should have 6 nodes");
  assert.strictEqual(elements.edges.length, 6, "Should have 6 edges");

  assert.ok(hasEdge(elements, "A", "B"), "Should have edge A -> B");
  assert.ok(hasEdge(elements, "B", "C"), "Should have edge B -> C");
  assert.ok(hasEdge(elements, "A", "D"), "Should have edge A -> D");
  assert.ok(hasEdge(elements, "D", "E"), "Should have edge D -> E");
  assert.ok(hasEdge(elements, "C", "F"), "Should have edge C -> F");
  assert.ok(hasEdge(elements, "E", "F"), "Should have edge E -> F");
});

test("parbegin/parend integration: nested parallel branches merge correctly", () => {
  const { elements } = compile(`BEGIN
  A;
  PARBEGIN
    BEGIN
      B;
      PARBEGIN
        BEGIN
          C;
        END
        BEGIN
          D;
        END
      PAREND;
      E;
    END
    BEGIN
      F;
    END
  PAREND;
  G;
END`);

  for (const label of ["A", "B", "C", "D", "E", "F", "G"]) {
    assert.strictEqual(
      countByLabel(elements, label),
      1,
      `Should have one ${label}`,
    );
  }

  assert.strictEqual(elements.nodes.length, 7, "Should have 7 nodes");
  assert.strictEqual(elements.edges.length, 8, "Should have 8 edges");

  assert.ok(hasEdge(elements, "A", "B"), "Should have edge A -> B");
  assert.ok(hasEdge(elements, "A", "F"), "Should have edge A -> F");
  assert.ok(hasEdge(elements, "B", "C"), "Should have edge B -> C");
  assert.ok(hasEdge(elements, "B", "D"), "Should have edge B -> D");
  assert.ok(hasEdge(elements, "C", "E"), "Should have edge C -> E");
  assert.ok(hasEdge(elements, "D", "E"), "Should have edge D -> E");
  assert.ok(hasEdge(elements, "E", "G"), "Should have edge E -> G");
  assert.ok(hasEdge(elements, "F", "G"), "Should have edge F -> G");
});

test("parbegin/parend integration: empty parallel block preserves sequential flow", () => {
  const { elements } = compile(`BEGIN
  A;
  PARBEGIN
  PAREND;
  B;
END`);

  assert.strictEqual(
    elements.nodes.length,
    2,
    "Should keep both sequential nodes",
  );
  assert.strictEqual(elements.edges.length, 1, "Should keep the A -> B edge");
  assert.ok(hasEdge(elements, "A", "B"), "Should have edge A -> B");
});

test("parbegin/parend integration: comments do not affect graph structure", () => {
  const { elements } = compile(`// intro
BEGIN
  A;
  // branch begins
  PARBEGIN
    BEGIN
      B;
    END
    BEGIN
      C;
    END
  PAREND;
  D;
END`);

  assert.strictEqual(elements.nodes.length, 4, "Should have 4 nodes");
  assert.strictEqual(elements.edges.length, 4, "Should have 4 edges");
  assert.ok(hasEdge(elements, "A", "B"), "Should have edge A -> B");
  assert.ok(hasEdge(elements, "A", "C"), "Should have edge A -> C");
  assert.ok(hasEdge(elements, "B", "D"), "Should have edge B -> D");
  assert.ok(hasEdge(elements, "C", "D"), "Should have edge C -> D");
});
