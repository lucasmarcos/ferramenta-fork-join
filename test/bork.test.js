import assert from "node:assert";
import { test } from "node:test";
import { parser } from "../out/forkjoin/parser.js";
import { resolve } from "../out/forkjoin/resolve.js";
import { treewalk } from "../out/forkjoin/treewalk.js";

const code = `
VAR_H = 6;
VAR_D = 3;

FORK ROT_A;
B;
JOIN VAR_D, ROT_D, QUIT;

ROT_A:
  A;
  FORK ROT_C;
  JOIN VAR_D, ROT_D, QUIT;

ROT_D:
  D;
  FORK ROT_E;
  FORK ROT_G;
  F;
  JOIN VAR_H, ROT_H, QUIT;

ROT_C:
  C;
  JOIN VAR_D, ROT_D, QUIT;

ROT_E:
  E;
  JOIN VAR_H, ROT_H, QUIT;

ROT_G:
  G;
  JOIN VAR_H, ROT_H, QUIT;

ROT_H:
  H;
`;

test("borked", () => {
  const tree = parser.parse(code);
  const walked = treewalk(code, tree);
  const _elements = resolve(walked.threads);

  assert.ok(false, "should have edges d -> e and d -> g");
});
