import assert from "node:assert";
import { test } from "node:test";
import { parser } from "../out/forkjoin/parser.js";
import { treewalk } from "../out/forkjoin/treewalk.js";

test("ex shouldReportTwoMissingJoinVariableErrorsForVAR_C", () => {
  const code = `
    A;
    FORK ROT_C;
    B;
    JOIN VAR_C, ROT_D, QUIT;

    ROT_C:
      C;
      JOIN VAR_C, ROT_D, QUIT;

    ROT_D:
      D;
  `;

  const tree = parser.parse(code);
  const { errors } = treewalk(code, tree);

  assert.strictEqual(errors.length, 2, "Two errors");

  assert.strictEqual(
    errors[0].type,
    "join-missing-variable",
    "First error is undefined label",
  );

  assert.strictEqual(errors[0].label, "VAR_C", "First error on VAR_C label");

  assert.strictEqual(
    errors[1].type,
    "join-missing-variable",
    "Second error is undefined label",
  );

  assert.strictEqual(errors[1].label, "VAR_C", "Second error on VAR_C label");
});
