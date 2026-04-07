import assert from "node:assert";
import { test } from "node:test";
import { parser } from "../out/forkjoin/parser.js";
import { resolve } from "../out/forkjoin/resolve.js";
import { treewalk } from "../out/forkjoin/treewalk.js";

test("default rodolfo example 1", () => {
  const ex1 = `
    var_F = 2;
    var_G = 2;
    var_H = 2;

    A;
    FORK ROT_C;
    FORK ROT_D;
    FORK ROT_E;
    B;
    JOIN var_F, ROT_F, QUIT;

    ROT_C: C;
          JOIN var_F, ROT_F, QUIT;

    ROT_D: D;
          JOIN var_G, ROT_G, QUIT;

    ROT_E: E;
          JOIN var_H, ROT_H, QUIT;

    ROT_F: F;
          JOIN var_G, ROT_G, QUIT;

    ROT_G: G;
          JOIN var_H, ROT_H, QUIT;

    ROT_H: H;
          QUIT;
  `;

  const tree = parser.parse(ex1);
  const { threads, errors } = treewalk(ex1, tree);
  const resolved = resolve(threads);

  assert.strictEqual(errors.length, 0, "No errors in ex1");
  assert.ok(
    resolved.nodes.find((n) => n.data.label === "A"),
    "A exists",
  );
  assert.ok(
    resolved.nodes.find((n) => n.data.label === "B"),
    "B exists",
  );
  assert.ok(
    resolved.nodes.find((n) => n.data.label === "C"),
    "C exists",
  );
  assert.ok(
    resolved.nodes.find((n) => n.data.label === "D"),
    "D exists",
  );
  assert.ok(
    resolved.nodes.find((n) => n.data.label === "E"),
    "E exists",
  );
  assert.ok(
    resolved.nodes.find((n) => n.data.label === "F"),
    "F exists",
  );
  assert.ok(
    resolved.nodes.find((n) => n.data.label === "G"),
    "G exists",
  );
  assert.ok(
    resolved.nodes.find((n) => n.data.label === "H"),
    "H exists",
  );
});

test("default rodolfo example 2", () => {
  const ex2 = `
    var_E = 2;

    FORK ROT_C;
    A;
    B;
    JOIN var_E, ROT_E, QUIT;

    ROT_C: C;
          D;
          JOIN var_E, ROT_E, QUIT;

    ROT_E: E;
          F;
          QUIT;
  `;

  const tree = parser.parse(ex2);
  const { threads, errors } = treewalk(ex2, tree);
  const resolved = resolve(threads);

  assert.strictEqual(errors.length, 0, "No errors in ex2");

  assert.ok(
    resolved.nodes.find((n) => n.data.label === "A"),
    "A exists",
  );
  assert.ok(
    resolved.nodes.find((n) => n.data.label === "B"),
    "B exists",
  );
  assert.ok(
    resolved.nodes.find((n) => n.data.label === "C"),
    "C exists",
  );
  assert.ok(
    resolved.nodes.find((n) => n.data.label === "D"),
    "D exists",
  );
  assert.ok(
    resolved.nodes.find((n) => n.data.label === "E"),
    "E exists",
  );
  assert.ok(
    resolved.nodes.find((n) => n.data.label === "F"),
    "F exists",
  );
});

test("default rodolfo example 3", () => {
  const ex3 = `
    var_R5 = 2;
    var_R6 = 2;
    var_R7 = 2;

    FORK ROT_R4;
    R1;
    FORK ROT_R3;
    R2;
    JOIN var_R5, ROT_R5, QUIT;

    ROT_R4: R4;
            JOIN var_R6, ROT_R6, QUIT;

    ROT_R3: R3;
            FORK ROT_R6';
            JOIN var_R5, ROT_R5, QUIT;

    ROT_R5: R5;
    	      JOIN var_R7, ROT_R7, QUIT;

    ROT_R6: R6;
    	      JOIN var_R7, ROT_R7, QUIT;

    ROT_R6': JOIN var_R6, ROT_R6, QUIT;

    ROT_R7: R7;
    	      QUIT;
  `;

  const tree = parser.parse(ex3);
  const { threads, errors } = treewalk(ex3, tree);
  const resolved = resolve(threads);

  assert.strictEqual(errors.length, 0, "No errors in ex3");

  assert.ok(
    resolved.nodes.find((n) => n.data.label === "R1"),
    "R1 exists",
  );
  assert.ok(
    resolved.nodes.find((n) => n.data.label === "R2"),
    "R2 exists",
  );
  assert.ok(
    resolved.nodes.find((n) => n.data.label === "R3"),
    "R3 exists",
  );
  assert.ok(
    resolved.nodes.find((n) => n.data.label === "R4"),
    "R4 exists",
  );
  assert.ok(
    resolved.nodes.find((n) => n.data.label === "R5"),
    "R5 exists",
  );
  assert.ok(
    resolved.nodes.find((n) => n.data.label === "R6"),
    "R6 exists",
  );
  assert.ok(
    resolved.nodes.find((n) => n.data.label === "R7"),
    "R7 exists",
  );
});
