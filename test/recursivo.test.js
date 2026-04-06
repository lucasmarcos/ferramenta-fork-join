import assert from "node:assert";
import { test } from "node:test";
import { recursivo } from "../out/forkjoin/recursivo.js";

test("recursivo", () => {
  // Mock blockMap for simplicity or use real treewalk logic
  const blockMap = new Map();
  blockMap.set("a", [
    { name: "Call", children: [{ name: "Label", text: "b" }] },
  ]);
  const res = recursivo(blockMap);
  assert.ok(res.has("a"));
  assert.ok(res.get("a").has("b"));
});
