import assert from "node:assert";
import { test } from "node:test";

import { resolve } from "../out/resolve.js";

test("entreda vazia grafo vazio", (t) => {
  const input = new Map();
  const output = resolve(input);
  const expected = "digraph { }";

  assert.strictEqual(output, expected);
});

test("entreda com uma chamada", (t) => {
  const input = new Map();

  input.set(undefined, [
    { label: "A", id: "cf5e2d1d-0755-4a6a-ae2f-a7e8300024e5" },
  ]);

  const output = resolve(input);
  const expected = `digraph { "cf5e2d1d-0755-4a6a-ae2f-a7e8300024e5" [label="A" shape=circle width=0.5 fixedsize=shape]; }`;

  assert.strictEqual(output, expected);
});

test("entreda joinOn", (t) => {
  const input = new Map();

  input.set(undefined, [
    { label: "A", id: "cf5e2d1d-0755-4a6a-ae2f-a7e8300024e5" },
  ]);

  const output = resolve(input);
  const expected = `digraph { "cf5e2d1d-0755-4a6a-ae2f-a7e8300024e5" [label="A" shape=circle width=0.5 fixedsize=shape]; }`;

  assert.strictEqual(output, expected);
});

test("entreda forkTo", (t) => {
  const input = new Map();

  input.set(undefined, [
    { label: "A", id: "cf5e2d1d-0755-4a6a-ae2f-a7e8300024e5" },
  ]);

  const output = resolve(input);
  const expected = `digraph { "cf5e2d1d-0755-4a6a-ae2f-a7e8300024e5" [label="A" shape=circle width=0.5 fixedsize=shape]; }`;

  assert.strictEqual(output, expected);
});
