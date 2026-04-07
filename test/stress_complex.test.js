import assert from "node:assert";
import { test } from "node:test";
import { lintForkJoin } from "../out/forkjoin/lint.js";
import { parser } from "../out/forkjoin/parser.js";
import { resolve } from "../out/forkjoin/resolve.js";
import { treewalk } from "../out/forkjoin/treewalk.js";

const complexCode = `
VAR_A = 2;
VAR_B = 3;
VAR_C = 2;
VAR_D = 4;

START;
LOAD_DATA;
FORK WORKER_A1;
PROCESS_MAIN;
JOIN VAR_A, STAGE_3, QUIT;

WORKER_A1:
  PROCESS_A1;
  JOIN VAR_A, STAGE_3, QUIT;

STAGE_3:
  COMBINE_A;
  FORK WORKER_B1;
  FORK WORKER_B2;
  PROCESS_B_MAIN;
  JOIN VAR_B, STAGE_4, QUIT;

WORKER_B1:
  TASK_B1_1;
  TASK_B1_2;
  JOIN VAR_B, STAGE_4, QUIT;

WORKER_B2:
  TASK_B2_1;
  JOIN VAR_B, STAGE_4, QUIT;

STAGE_4:
  AGGREGATE_B;
  FORK NESTED_PATH;
  DIRECT_PATH;
  JOIN VAR_C, STAGE_5, QUIT;

NESTED_PATH:
  NESTED_1;
  FORK DEEP_1;
  FORK DEEP_2;
  FORK DEEP_3;
  NESTED_2;
  JOIN VAR_D, NESTED_MERGE, QUIT;

DEEP_1:
  DEEP_TASK_1;
  JOIN VAR_D, NESTED_MERGE, QUIT;

DEEP_2:
  DEEP_TASK_2;
  JOIN VAR_D, NESTED_MERGE, QUIT;

DEEP_3:
  DEEP_TASK_3;
  JOIN VAR_D, NESTED_MERGE, QUIT;

NESTED_MERGE:
  NESTED_DONE;
  JOIN VAR_C, STAGE_5, QUIT;

STAGE_5:
  FINALIZE;
  SAVE_RESULTS;
  QUIT;
`;

test("stress: complex pipeline parses without syntax errors", () => {
  const tree = parser.parse(complexCode);
  const cursor = tree.cursor();

  const hasError = (cur) => {
    if (cur.type.isError) return true;
    if (cur.firstChild()) {
      do {
        if (hasError(cur)) return true;
      } while (cur.nextSibling());
      cur.parent();
    }
    return false;
  };

  assert.strictEqual(
    hasError(cursor),
    false,
    "Should parse without syntax errors",
  );
});

test("stress: complex pipeline has no lint errors", () => {
  const result = lintForkJoin(complexCode);

  assert.strictEqual(
    result.diagnostics.length,
    0,
    "Should have no lint errors",
  );
  assert.strictEqual(result.hasErrors, false);
});

test("stress: complex pipeline generates correct thread count", () => {
  const tree = parser.parse(complexCode);
  const walked = treewalk(complexCode, tree);

  assert.strictEqual(walked.threads.size, 12, "Should have 12 threads");
});

test("stress: complex pipeline generates correct graph size", () => {
  const tree = parser.parse(complexCode);
  const walked = treewalk(complexCode, tree);
  const elements = resolve(walked.threads);
  assert.strictEqual(elements.nodes.length, 19, "Should have 19 nodes");
  assert.strictEqual(elements.edges.length, 25, "Should have 25 edges");
});

test("stress: complex pipeline has all expected nodes", () => {
  const tree = parser.parse(complexCode);
  const walked = treewalk(complexCode, tree);
  const elements = resolve(walked.threads);

  const nodeLabels = elements.nodes.map((e) => e.data.label);

  const expectedNodes = [
    "START",
    "LOAD_DATA",
    "PROCESS_MAIN",
    "PROCESS_A1",
    "COMBINE_A",
    "PROCESS_B_MAIN",
    "TASK_B1_1",
    "TASK_B1_2",
    "TASK_B2_1",
    "AGGREGATE_B",
    "DIRECT_PATH",
    "NESTED_1",
    "NESTED_2",
    "DEEP_TASK_1",
    "DEEP_TASK_2",
    "DEEP_TASK_3",
    "NESTED_DONE",
    "FINALIZE",
    "SAVE_RESULTS",
  ];

  for (const expected of expectedNodes) {
    assert.ok(nodeLabels.includes(expected), `Should have node ${expected}`);
  }
});

test("stress: complex pipeline synchronization variables are valid", () => {
  const tree = parser.parse(complexCode);
  const walked = treewalk(complexCode, tree);
  assert.strictEqual(
    walked.errors.length,
    0,
    "Should have no validation errors",
  );
});
