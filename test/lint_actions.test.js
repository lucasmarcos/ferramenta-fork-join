import assert from "node:assert";
import { test } from "node:test";
import { getActionsForError } from "../out/forkjoin/actions.js";
import { lintForkJoin } from "../out/forkjoin/lint.js";
import { parser } from "../out/forkjoin/parser.js";
import { checkSyntax } from "../out/forkjoin/syntax.js";

test("syntax: missing semicolon after Call", () => {
  const code = `C3
  JOIN VAR_J, ROT_C4, QUIT;`;
  const tree = parser.parse(code);
  const errors = checkSyntax(tree);

  assert.strictEqual(errors.length, 1);
  assert.strictEqual(errors[0].type, "missing-semicolon");
  assert.strictEqual(errors[0].message, "Falta ponto e vírgula");
  assert.strictEqual(errors[0].start, 2);
});

test("syntax: missing semicolon after Fork", () => {
  const code = `FORK label
C1;`;
  const tree = parser.parse(code);
  const errors = checkSyntax(tree);

  assert.strictEqual(errors.length, 1);
  assert.strictEqual(errors[0].type, "missing-semicolon");
});

test("syntax: missing semicolon after Assign", () => {
  const code = `VAR = 2
C1;`;
  const tree = parser.parse(code);
  const errors = checkSyntax(tree);

  assert.strictEqual(errors.length, 1);
  assert.strictEqual(errors[0].type, "missing-semicolon");
  assert.strictEqual(errors[0].start, 7);
});

test("syntax: generic syntax error", () => {
  const code = `FORK ;`;
  const tree = parser.parse(code);
  const errors = checkSyntax(tree);

  assert.strictEqual(errors.length, 1);
  assert.strictEqual(errors[0].type, "syntax-error");
  assert.strictEqual(errors[0].message, "Erro de sintaxe");
});

test("syntax: no errors on valid code", () => {
  const code = `VAR = 2;
C1;
FORK ROT;
JOIN VAR, ROT, QUIT;
ROT: QUIT;`;
  const tree = parser.parse(code);
  const errors = checkSyntax(tree);

  assert.strictEqual(errors.length, 0);
});

test("lint: missing semicolon has action", () => {
  const code = `C3
  C4;`;
  const result = lintForkJoin(code);

  assert.strictEqual(result.hasErrors, true);
  assert.strictEqual(result.diagnostics.length, 1);
  assert.strictEqual(result.diagnostics[0].message, "Falta ponto e vírgula");
  assert.strictEqual(result.diagnostics[0].actions.length, 1);
  assert.strictEqual(result.diagnostics[0].actions[0].name, "Inserir");
});

test("lint: fork-missing-label error", () => {
  const code = `FORK NONEXISTENT;`;
  const result = lintForkJoin(code);

  assert.strictEqual(result.hasErrors, true);
  const err = result.diagnostics.find((d) => d.message.includes("FORK"));
  assert.ok(err);
  assert.strictEqual(err.actions.length, 1);
  assert.strictEqual(err.actions[0].name, "Criar");
});

test("lint: join-missing-label error", () => {
  const code = `VAR = 1;
JOIN VAR, NONEXISTENT, QUIT;`;
  const result = lintForkJoin(code);

  assert.strictEqual(result.hasErrors, true);
  const err = result.diagnostics.find(
    (d) => d.message.includes("JOIN") && d.message.includes("rótulo"),
  );
  assert.ok(err);
  assert.strictEqual(err.actions.length, 1);
  assert.strictEqual(err.actions[0].name, "Criar");
});

test("lint: join-missing-variable error", () => {
  const code = `JOIN NONEXISTENT_VAR, ROT, QUIT;
ROT: QUIT;`;
  const result = lintForkJoin(code);

  assert.strictEqual(result.hasErrors, true);
  const err = result.diagnostics.find((d) => d.message.includes("variável"));
  assert.ok(err);
  assert.strictEqual(err.actions.length, 1);
  assert.strictEqual(err.actions[0].name, "Criar");
});

test("lint: join-missing-quit error", () => {
  const code = `VAR = 1;
JOIN VAR, ROT, OTHER;
ROT: QUIT;
OTHER: QUIT;`;
  const result = lintForkJoin(code);

  const err = result.diagnostics.find((d) => d.message.includes("QUIT"));
  assert.ok(err);
  assert.strictEqual(err.actions.length, 1);
  assert.strictEqual(err.actions[0].name, "Trocar");
});

test("lint: code-after-quit warning", () => {
  const code = `C1; QUIT; C2;`;
  const result = lintForkJoin(code);

  const err = result.diagnostics.find((d) => d.message.includes("após o QUIT"));
  assert.ok(err);
  assert.strictEqual(err.severity, "warning");
  assert.strictEqual(err.actions.length, 1);
  assert.strictEqual(err.actions[0].name, "Remover");
});

test("lint: no errors on valid complete program", () => {
  const code = `VAR_J = 2;
C1;
FORK ROT_C3;
C2;
JOIN VAR_J, ROT_C4, QUIT;

ROT_C3:
  C3;
  JOIN VAR_J, ROT_C4, QUIT;

ROT_C4:
  C4;
  QUIT;`;
  const result = lintForkJoin(code);

  assert.strictEqual(result.hasErrors, false);
  assert.strictEqual(result.diagnostics.length, 0);
});

test("action: missing-semicolon inserts semicolon", () => {
  const err = { type: "missing-semicolon", message: "", start: 2, end: 2 };
  const actions = getActionsForError(err);

  assert.strictEqual(actions.length, 1);
  assert.strictEqual(actions[0].name, "Inserir");
});

test("action: fork-missing-label creates block", () => {
  const err = {
    type: "fork-missing-label",
    message: "",
    start: 0,
    end: 10,
    label: "ROT",
    severity: "error",
  };
  const actions = getActionsForError(err);

  assert.strictEqual(actions.length, 1);
  assert.strictEqual(actions[0].name, "Criar");
});

test("action: join-missing-label creates block", () => {
  const err = {
    type: "join-missing-label",
    message: "",
    start: 0,
    end: 10,
    label: "ROT",
    severity: "error",
  };
  const actions = getActionsForError(err);

  assert.strictEqual(actions.length, 1);
  assert.strictEqual(actions[0].name, "Criar");
});

test("action: join-missing-variable creates variable", () => {
  const err = {
    type: "join-missing-variable",
    message: "",
    start: 0,
    end: 10,
    label: "VAR",
    severity: "error",
  };
  const actions = getActionsForError(err);

  assert.strictEqual(actions.length, 1);
  assert.strictEqual(actions[0].name, "Criar");
});

test("action: join-missing-quit replaces with QUIT", () => {
  const err = {
    type: "join-missing-quit",
    message: "",
    start: 0,
    end: 10,
    severity: "error",
  };
  const actions = getActionsForError(err);

  assert.strictEqual(actions.length, 1);
  assert.strictEqual(actions[0].name, "Trocar");
});

test("action: code-after-quit removes code", () => {
  const err = {
    type: "code-after-quit",
    message: "",
    start: 0,
    end: 10,
    severity: "warning",
  };
  const actions = getActionsForError(err);

  assert.strictEqual(actions.length, 1);
  assert.strictEqual(actions[0].name, "Remover");
});

test("action: syntax-error has no action", () => {
  const err = { type: "syntax-error", message: "", start: 0, end: 10 };
  const actions = getActionsForError(err);

  assert.strictEqual(actions.length, 0);
});
