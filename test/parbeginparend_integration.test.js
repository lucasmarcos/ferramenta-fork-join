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

test("parbegin/parend integration: bare top-level calls compile to a chain", () => {
  const { ir, elements } = compile(`A;
B;
C;`);

  assert.deepStrictEqual(ir, ["A", "B", "C"], "IR should keep bare calls");
  assert.deepStrictEqual(
    elements.nodes.map((node) => node.data.label),
    ["A", "B", "C"],
    "Should create nodes for all bare calls",
  );
  assert.deepStrictEqual(
    edgePairs(elements),
    [
      ["A", "B"],
      ["B", "C"],
    ],
    "Should create A -> B -> C for bare calls",
  );
});

test("parbegin/parend integration: sequential program compiles to a chain", () => {
  const { ir, elements } = compile(`
    BEGIN
      A;
      B;
      C;
    END
  `);

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
      PAREND
      E;
    END
    BEGIN
      F;
    END
  PAREND
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
  PAREND
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
  PAREND
  D;
END`);

  assert.strictEqual(elements.nodes.length, 4, "Should have 4 nodes");
  assert.strictEqual(elements.edges.length, 4, "Should have 4 edges");
  assert.ok(hasEdge(elements, "A", "B"), "Should have edge A -> B");
  assert.ok(hasEdge(elements, "A", "C"), "Should have edge A -> C");
  assert.ok(hasEdge(elements, "B", "D"), "Should have edge B -> D");
  assert.ok(hasEdge(elements, "C", "D"), "Should have edge C -> D");
});

test("parbegin/parend integration: stress program preserves deep parallel structure", () => {
  const { elements } = compile(`BEGIN
  A1;
  A2;
  PARBEGIN
    BEGIN
      B1;
      B2;
      PARBEGIN
        BEGIN
          C1;
          C2;
          PARBEGIN
            BEGIN
              D1;
              D2;
            END
            BEGIN
              D3;
              D4;
              D5;
            END
            BEGIN
              D6;
            END
          PAREND
          C3;
        END
        BEGIN
          C4;
          PARBEGIN
            BEGIN
              E1;
              E2;
            END
            BEGIN
              E3;
            END
          PAREND
          C5;
        END
        BEGIN
          C6;
          C7;
        END
      PAREND
      B3;
    END
    BEGIN
      F1;
      PARBEGIN
        BEGIN
          G1;
          G2;
        END
        BEGIN
          G3;
          PARBEGIN
            BEGIN
              H1;
            END
            BEGIN
              H2;
              H3;
            END
          PAREND
          G4;
        END
      PAREND
      F2;
      F3;
    END
    BEGIN
      I1;
      I2;
      I3;
    END
    BEGIN
      J1;
      PARBEGIN
        BEGIN
          K1;
        END
        BEGIN
          K2;
          K3;
        END
        BEGIN
          K4;
          PARBEGIN
            BEGIN
              L1;
              L2;
            END
            BEGIN
              L3;
            END
          PAREND
          K5;
        END
      PAREND
      J2;
    END
  PAREND
  M1;
  PARBEGIN
    BEGIN
      N1;
      N2;
    END
    BEGIN
      O1;
      PARBEGIN
        BEGIN
          P1;
          P2;
        END
        BEGIN
          P3;
        END
      PAREND
      O2;
    END
  PAREND
  Z1;
  Z2;
END`);

  const expectedLabels = [
    "A1",
    "A2",
    "B1",
    "B2",
    "C1",
    "C2",
    "D1",
    "D2",
    "D3",
    "D4",
    "D5",
    "D6",
    "C3",
    "C4",
    "E1",
    "E2",
    "E3",
    "C5",
    "C6",
    "C7",
    "B3",
    "F1",
    "G1",
    "G2",
    "G3",
    "H1",
    "H2",
    "H3",
    "G4",
    "F2",
    "F3",
    "I1",
    "I2",
    "I3",
    "J1",
    "K1",
    "K2",
    "K3",
    "K4",
    "L1",
    "L2",
    "L3",
    "K5",
    "J2",
    "M1",
    "N1",
    "N2",
    "O1",
    "P1",
    "P2",
    "P3",
    "O2",
    "Z1",
    "Z2",
  ];

  for (const label of expectedLabels) {
    assert.strictEqual(
      countByLabel(elements, label),
      1,
      `Should have one ${label}`,
    );
  }

  assert.strictEqual(
    elements.nodes.length,
    expectedLabels.length,
    "Should include every stress node once",
  );
  assert.ok(
    elements.edges.length > 60,
    "Should create a large dependency graph",
  );

  assert.ok(
    hasEdge(elements, "A1", "A2"),
    "Should preserve top-level sequential edge A1 -> A2",
  );
  assert.ok(
    hasEdge(elements, "A2", "B1"),
    "Should branch from A2 into B branch",
  );
  assert.ok(
    hasEdge(elements, "A2", "F1"),
    "Should branch from A2 into F branch",
  );
  assert.ok(
    hasEdge(elements, "A2", "I1"),
    "Should branch from A2 into I branch",
  );
  assert.ok(
    hasEdge(elements, "A2", "J1"),
    "Should branch from A2 into J branch",
  );
  assert.ok(
    hasEdge(elements, "C2", "D1"),
    "Should branch from C2 into first D branch",
  );
  assert.ok(
    hasEdge(elements, "C2", "D3"),
    "Should branch from C2 into second D branch",
  );
  assert.ok(
    hasEdge(elements, "C2", "D6"),
    "Should branch from C2 into third D branch",
  );
  assert.ok(hasEdge(elements, "D2", "C3"), "Should merge D1/D2 branch into C3");
  assert.ok(
    hasEdge(elements, "D5", "C3"),
    "Should merge D3/D4/D5 branch into C3",
  );
  assert.ok(hasEdge(elements, "D6", "C3"), "Should merge D6 branch into C3");
  assert.ok(hasEdge(elements, "G3", "H1"), "Should branch from G3 into H1");
  assert.ok(
    hasEdge(elements, "G3", "H2"),
    "Should branch from G3 into H2/H3 branch",
  );
  assert.ok(hasEdge(elements, "H1", "G4"), "Should merge H1 into G4");
  assert.ok(hasEdge(elements, "H3", "G4"), "Should merge H2/H3 branch into G4");
  assert.ok(
    hasEdge(elements, "K4", "L1"),
    "Should branch from K4 into L1/L2 branch",
  );
  assert.ok(
    hasEdge(elements, "K4", "L3"),
    "Should branch from K4 into L3 branch",
  );
  assert.ok(hasEdge(elements, "L2", "K5"), "Should merge L1/L2 into K5");
  assert.ok(hasEdge(elements, "L3", "K5"), "Should merge L3 into K5");
  assert.ok(hasEdge(elements, "B3", "M1"), "Should merge B branch into M1");
  assert.ok(hasEdge(elements, "F3", "M1"), "Should merge F branch into M1");
  assert.ok(hasEdge(elements, "I3", "M1"), "Should merge I branch into M1");
  assert.ok(hasEdge(elements, "J2", "M1"), "Should merge J branch into M1");
  assert.ok(
    hasEdge(elements, "M1", "N1"),
    "Should branch from M1 into N branch",
  );
  assert.ok(
    hasEdge(elements, "M1", "O1"),
    "Should branch from M1 into O branch",
  );
  assert.ok(
    hasEdge(elements, "O1", "P1"),
    "Should branch from O1 into P1/P2 branch",
  );
  assert.ok(
    hasEdge(elements, "O1", "P3"),
    "Should branch from O1 into P3 branch",
  );
  assert.ok(hasEdge(elements, "P2", "O2"), "Should merge P1/P2 branch into O2");
  assert.ok(hasEdge(elements, "P3", "O2"), "Should merge P3 branch into O2");
  assert.ok(hasEdge(elements, "N2", "Z1"), "Should merge N branch into Z1");
  assert.ok(hasEdge(elements, "O2", "Z1"), "Should merge O branch into Z1");
  assert.ok(
    hasEdge(elements, "Z1", "Z2"),
    "Should preserve final sequential edge Z1 -> Z2",
  );
});
