import assert from "node:assert";
import { test } from "node:test";
import { getActionsForError } from "../out/parbeginparend/actions.js";
import { lintParBeginParEnd } from "../out/parbeginparend/lint.js";
import { parser } from "../out/parbeginparend/parser.js";
import { checkSyntax } from "../out/parbeginparend/syntax.js";
import { validateStructure } from "../out/parbeginparend/validation.js";

test("parbegin/parend syntax: missing semicolon after call", () => {
  const tree = parser.parse("BEGIN\n  A\nEND");
  const errors = checkSyntax(tree);

  assert.strictEqual(errors.length, 1);
  assert.strictEqual(errors[0].type, "missing-semicolon");
  assert.strictEqual(errors[0].message, "Falta ponto e virgula");
});

test("parbegin/parend syntax: bare call reports missing semicolon", () => {
  const tree = parser.parse("A");
  const errors = checkSyntax(tree);

  assert.strictEqual(errors.length, 1);
  assert.strictEqual(errors[0].type, "missing-semicolon");
  assert.strictEqual(errors[0].message, "Falta ponto e virgula");
});

test("parbegin/parend syntax: unterminated call inside BEGIN reports missing semicolon", () => {
  const tree = parser.parse(`BEGIN
a
`);
  const errors = checkSyntax(tree);

  assert.strictEqual(errors.length, 1);
  assert.strictEqual(errors[0].type, "missing-semicolon");
  assert.strictEqual(errors[0].message, "Falta ponto e virgula");
});

test("parbegin/parend syntax: generic syntax error on malformed block", () => {
  const tree = parser.parse("BEGIN\n  ;\nEND");
  const errors = checkSyntax(tree);

  assert.ok(errors.length > 0, "Should report syntax error");
  assert.ok(errors.some((error) => error.type === "syntax-error"));
});

test("parbegin/parend lint: missing semicolon has quick fix", () => {
  const result = lintParBeginParEnd("BEGIN\n  A\nEND");

  assert.strictEqual(result.hasErrors, true);
  assert.strictEqual(result.diagnostics.length, 1);
  assert.strictEqual(result.diagnostics[0].severity, "error");
  assert.strictEqual(result.diagnostics[0].actions.length, 1);
  assert.strictEqual(result.diagnostics[0].actions[0].name, "Inserir");
});

test("parbegin/parend validation: empty parallel block produces warning", () => {
  const tree = parser.parse("BEGIN\n  PARBEGIN\n  PAREND\nEND");
  const issues = validateStructure(tree);

  assert.strictEqual(issues.length, 1);
  assert.strictEqual(issues[0].type, "empty-parallel-block");
  assert.strictEqual(issues[0].severity, "warning");
});

test("parbegin/parend lint: empty parallel block has removal suggestion", () => {
  const result = lintParBeginParEnd("BEGIN\n  PARBEGIN\n  PAREND\nEND");
  const warning = result.diagnostics.find((diag) =>
    diag.message.includes("paralelo"),
  );

  assert.strictEqual(result.hasErrors, false);
  assert.ok(warning, "Should report empty parallel block warning");
  assert.strictEqual(warning.severity, "warning");
  assert.strictEqual(warning.actions.length, 1);
  assert.strictEqual(warning.actions[0].name, "Remover");
});

test("parbegin/parend lint: empty sequential block has removal suggestion", () => {
  const result = lintParBeginParEnd("BEGIN\n  BEGIN\n  END\nEND");
  const warning = result.diagnostics.find((diag) =>
    diag.message.includes("sequencial"),
  );

  assert.strictEqual(result.hasErrors, false);
  assert.ok(warning, "Should report empty sequential block warning");
  assert.strictEqual(warning.severity, "warning");
  assert.strictEqual(warning.actions.length, 1);
  assert.strictEqual(warning.actions[0].name, "Remover");
});

test("parbegin/parend lint: mismatched END closing PARBEGIN is reported", () => {
  const result = lintParBeginParEnd(`PARBEGIN
  BEGIN
    A;
  END
END`);
  const mismatch = result.diagnostics.find((diag) =>
    diag.message.includes("use PAREND"),
  );
  const missing = result.diagnostics.find((diag) =>
    diag.message.includes("sem PAREND"),
  );

  assert.strictEqual(result.hasErrors, false);
  assert.ok(mismatch, "Should report mismatched END for PARBEGIN");
  assert.ok(missing, "Should still report the missing PAREND");
  assert.strictEqual(mismatch.actions.length, 1);
  assert.strictEqual(mismatch.actions[0].name, "Remover");
});

test("parbegin/parend lint: mismatched PAREND closing BEGIN is reported", () => {
  const result = lintParBeginParEnd(`BEGIN
  A;
PAREND`);
  const mismatch = result.diagnostics.find((diag) =>
    diag.message.includes("use END"),
  );
  const missing = result.diagnostics.find((diag) =>
    diag.message.includes("sem END"),
  );

  assert.strictEqual(result.hasErrors, false);
  assert.ok(mismatch, "Should report mismatched PAREND for BEGIN");
  assert.ok(missing, "Should still report the missing END");
  assert.strictEqual(mismatch.actions.length, 1);
  assert.strictEqual(mismatch.actions[0].name, "Remover");
});

test("parbegin/parend lint: stray END has removal suggestion", () => {
  const result = lintParBeginParEnd(`A;
B;
C;
D;
END`);
  const warning = result.diagnostics.find((diag) =>
    diag.message.includes("END sem BEGIN"),
  );

  assert.strictEqual(result.hasErrors, false);
  assert.ok(warning, "Should report stray END warning");
  assert.strictEqual(warning.severity, "warning");
  assert.strictEqual(warning.actions.length, 1);
  assert.strictEqual(warning.actions[0].name, "Remover");
});

test("parbegin/parend lint: stray PAREND has removal suggestion", () => {
  const result = lintParBeginParEnd(`A;
PAREND`);
  const warning = result.diagnostics.find((diag) =>
    diag.message.includes("PAREND sem PARBEGIN"),
  );

  assert.strictEqual(result.hasErrors, false);
  assert.ok(warning, "Should report stray PAREND warning");
  assert.strictEqual(warning.severity, "warning");
  assert.strictEqual(warning.actions.length, 1);
  assert.strictEqual(warning.actions[0].name, "Remover");
});

test("parbegin/parend lint: missing END has insertion suggestion", () => {
  const result = lintParBeginParEnd(`BEGIN
a;`);
  const warning = result.diagnostics.find((diag) =>
    diag.message.includes("sem END"),
  );

  assert.strictEqual(result.hasErrors, false);
  assert.ok(warning, "Should report missing END warning");
  assert.strictEqual(warning.severity, "warning");
  assert.strictEqual(warning.actions.length, 1);
  assert.strictEqual(warning.actions[0].name, "Inserir");
});

test("parbegin/parend lint: missing PAREND has insertion suggestion", () => {
  const result = lintParBeginParEnd(`BEGIN
  PARBEGIN
    A;`);
  const warning = result.diagnostics.find((diag) =>
    diag.message.includes("sem PAREND"),
  );

  assert.strictEqual(result.hasErrors, false);
  assert.ok(warning, "Should report missing PAREND warning");
  assert.strictEqual(warning.severity, "warning");
  assert.strictEqual(warning.actions.length, 1);
  assert.strictEqual(warning.actions[0].name, "Inserir");
});

test("parbegin/parend lint: valid program has no diagnostics", () => {
  const result = lintParBeginParEnd(`BEGIN
  A;
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

  assert.strictEqual(result.hasErrors, false);
  assert.strictEqual(result.diagnostics.length, 0);
});

test("parbegin/parend actions: syntax error has no quick fix", () => {
  const actions = getActionsForError({
    type: "syntax-error",
    message: "Erro de sintaxe",
    start: 0,
    end: 1,
  });

  assert.strictEqual(actions.length, 0);
});
