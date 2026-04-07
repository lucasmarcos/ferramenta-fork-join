import assert from "node:assert";
import { test } from "node:test";
import { parser } from "../out/parBeginParEndParser.js";
import { exampleParbeginParend } from "../out/parbeginparend/example.js";

test("exemplo.ts: exampleParbeginParend parses successfully", () => {
  const tree = parser.parse(exampleParbeginParend);

  assert.ok(tree, "Should parse example code");
  assert.ok(!tree.cursor().type.isError, "Should not have parse errors");
});

test("exemplo.ts: exampleParbeginParend contains expected commands", () => {
  assert.ok(
    exampleParbeginParend.includes("A"),
    "Should contain command A",
  );
  assert.ok(
    exampleParbeginParend.includes("B"),
    "Should contain command B",
  );
  assert.ok(
    exampleParbeginParend.includes("C"),
    "Should contain command C",
  );
  assert.ok(
    exampleParbeginParend.includes("D"),
    "Should contain command D",
  );
  assert.ok(
    exampleParbeginParend.includes("E"),
    "Should contain command E",
  );
  assert.ok(
    exampleParbeginParend.includes("F"),
    "Should contain command F",
  );
});

test("exemplo.ts: exampleParbeginParend uses PARBEGIN/PAREND", () => {
  assert.ok(
    exampleParbeginParend.includes("PARBEGIN"),
    "Should use PARBEGIN keyword",
  );
  assert.ok(
    exampleParbeginParend.includes("PAREND"),
    "Should use PAREND keyword",
  );
  assert.ok(
    exampleParbeginParend.includes("BEGIN"),
    "Should use BEGIN keyword",
  );
  assert.ok(
    exampleParbeginParend.includes("END"),
    "Should use END keyword",
  );
});

test("exemplo.ts: exampleParbeginParend demonstrates educational content", () => {
  const tree = parser.parse(exampleParbeginParend);
  assert.ok(tree, "Should parse successfully for educational use");

  assert.ok(
    exampleParbeginParend.includes("BEGIN"),
    "Should demonstrate sequential blocks",
  );
  assert.ok(
    exampleParbeginParend.includes("PARBEGIN"),
    "Should demonstrate parallel blocks",
  );

  const commandPattern = /[A-Z];/g;
  const commands = exampleParbeginParend.match(commandPattern);
  assert.ok(
    commands && commands.length >= 6,
    "Should have multiple commands for demonstration",
  );
});
