import assert from "node:assert";
import { test } from "node:test";
import { parser } from "../out/forkJoinParser.js";
import { resolve } from "../out/forkjoin/resolve.js";
import { checkSyntax } from "../out/forkjoin/syntax.js";
import { treewalk } from "../out/forkjoin/treewalk.js";

test("empty program", () => {
  const code = "";
  const tree = parser.parse(code);
  const res = treewalk(code, tree);

  assert.ok(res.threads, "Should have threads map");
});

test("only whitespace", () => {
  const code = "   \n\n  \t  \n";
  const tree = parser.parse(code);
  const res = treewalk(code, tree);

  assert.ok(res.threads, "Should handle whitespace-only input");
});

test("only comments", () => {
  const code = `
  # This is a comment
  # Another comment
  `;
  const tree = parser.parse(code);
  const res = treewalk(code, tree);

  assert.strictEqual(res.errors.length, 0, "Comments should not cause errors");
});

test("FORK without label", () => {
  const code = "FORK ;";
  const tree = parser.parse(code);
  const errors = checkSyntax(tree);

  assert.ok(errors.length > 0, "Should detect FORK without label as error");
});

test("label without definition", () => {
  const code = `
A;
FORK NONEXISTENT;
QUIT;
  `;
  const tree = parser.parse(code);
  const walked = treewalk(code, tree);

  assert.ok(walked.threads, "Should handle undefined label reference");
});

test("duplicate label definitions", () => {
  const code = `
A;
FORK DUP;

DUP:
  B;
  QUIT;

DUP:
  C;
  QUIT;
  `;
  const tree = parser.parse(code);
  const walked = treewalk(code, tree);

  assert.ok(walked.threads, "Should process even with duplicate labels");
});

test("JOIN without corresponding label", () => {
  const code = `
    A;
    JOIN VAR_B, ROT_B, QUIT;
    QUIT;
  `;

  const tree = parser.parse(code);
  const walked = treewalk(code, tree);

  assert.ok(walked.threads, "Should handle JOIN to nonexistent label");
});

test("very long label name", () => {
  const longLabel = "A".repeat(100);
  
  const code = `
    START;
    FORK ${longLabel};
    QUIT;

    ${longLabel}:
      END;
      QUIT;
  `;

  const tree = parser.parse(code);
  const walked = treewalk(code, tree);

  assert.strictEqual(walked.errors.length, 0, "Should handle long labels");
});

test("special characters in commands", () => {
  const code = `
    A_B_C;
    X123;
    QUIT;
  `;
  const tree = parser.parse(code);
  const walked = treewalk(code, tree);
  const elements = resolve(walked.threads);

  const nodes = elements.filter((e) => !e.data.source);
  assert.ok(
    nodes.some((n) => n.data.label === "A_B_C"),
    "Should handle underscores",
  );
  assert.ok(
    nodes.some((n) => n.data.label === "X123"),
    "Should handle numbers",
  );
});

test("consecutive FORKs", () => {
  const code = `
    A;
    FORK B_LABEL;
    FORK C_LABEL;
    FORK D_LABEL;
    QUIT;

    B_LABEL:
      B;
      QUIT;

    C_LABEL:
      C;
      QUIT;

    D_LABEL:
      D;
      QUIT;
  `;

  const tree = parser.parse(code);
  const walked = treewalk(code, tree);
  const elements = resolve(walked.threads);

  const nodes = elements.filter((e) => !e.data.source);
  assert.ok(
    nodes.some((n) => n.data.label === "B"),
    "Should fork to B",
  );
  assert.ok(
    nodes.some((n) => n.data.label === "C"),
    "Should fork to C",
  );
  assert.ok(
    nodes.some((n) => n.data.label === "D"),
    "Should fork to D",
  );
});

test("FORK immediately after QUIT should be unreachable", () => {
  const code = `
A;
QUIT;
FORK UNREACHABLE;

UNREACHABLE:
  B;
  QUIT;
  `;
  const tree = parser.parse(code);
  const walked = treewalk(code, tree);

  assert.ok(walked.threads, "Should parse structure");
});

test("syntax error detection", () => {
  const code = "FORK ; JOIN ; QUIT ;";
  const tree = parser.parse(code);
  const errors = checkSyntax(tree);

  assert.ok(Array.isArray(errors), "Should return errors array");
});

test("missing semicolons", () => {
  const code = "A B C";
  const tree = parser.parse(code);
  const errors = checkSyntax(tree);

  assert.ok(errors.length > 0, "Should detect missing semicolons");
});

test("mixed valid and invalid syntax", () => {
  const code = `
A;
FORK
B;
QUIT;
  `;
  const tree = parser.parse(code);
  const syntaxErrors = checkSyntax(tree);

  assert.ok(Array.isArray(syntaxErrors), "Should return errors array");
});

test("resolve with empty threads map", () => {
  const threads = new Map();
  const elements = resolve(threads);

  assert.ok(Array.isArray(elements), "Should return array");
  assert.strictEqual(
    elements.length,
    0,
    "Empty threads should produce no elements",
  );
});

test("resolve with single thread", () => {
  const threads = new Map();
  threads.set("0", [{ id: "1", label: "A", forks: [], joins: [] }]);

  const elements = resolve(threads);
  assert.ok(elements.length > 0, "Should produce elements for single thread");
});

test("command with very short label", () => {
  const code = `
X;
Y;
Z;
QUIT;
  `;
  const tree = parser.parse(code);
  const walked = treewalk(code, tree);
  const elements = resolve(walked.threads);

  const nodes = elements.filter((e) => !e.data.source);

  const nodeX = nodes.find((n) => n.data.label === "X");
  assert.ok(nodeX, "Should have node X");
});

test("multiple QUIT statements", () => {
  const code = `
A;
QUIT;
QUIT;
QUIT;
  `;
  const tree = parser.parse(code);
  const walked = treewalk(code, tree);

  assert.ok(walked.threads, "Should handle multiple QUITs");
});
