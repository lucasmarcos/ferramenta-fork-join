import assert from "node:assert";
import { test } from "node:test";

import { error } from "../out/error.js";

test("detecta erro", (t) => {
  const input = { rootNode: { type: "ERROR" } };
  const output = error(input);
  const expected = [{ type: "ERROR" }];
  assert.deepEqual(output, expected);
});

test("sem erro", (t) => {
  const input = { rootNode: { type: "call" } };
  const output = error(input);
  const expected = [];
  assert.deepEqual(output, expected);
});
