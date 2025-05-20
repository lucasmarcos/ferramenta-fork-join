import assert from "node:assert";
import { test } from "node:test";
import { recursivo } from "../out/recursivo.js";

test("recursivo", (t) => {
  const input = new Map();

  input.set("A", [
    {
      type: "call",
      child(id) {
        return { text: "B" };
      },
    },
  ]);

  input.set("B", [
    {
      type: "call",
      child(id) {
        return { text: "A" };
      },
    },
  ]);

  const output = recursivo(input);
  const expected = true;
  assert.strictEqual(output, expected);
});

test("vazio não é recursivo", (t) => {
  const input = new Map();
  input.set(undefined, []);

  const output = recursivo(input);
  const expected = false;
  assert.strictEqual(output, expected);
});

test("chamadas isoladas não é recursivo", (t) => {
  const input = new Map();

  input.set("A", [
    {
      type: "call",
      child(id) {
        return { text: "B" };
      },
    },
  ]);

  input.set("C", [
    {
      type: "call",
      child(id) {
        return { text: "D" };
      },
    },
  ]);

  const output = recursivo(input);
  const expected = false;
  assert.strictEqual(output, expected);
});
