import assert from "node:assert";
import { test } from "node:test";
import { parser } from "../out/parBeginParEndParser.js";
import { exploInicialParbeginParend } from "../out/parbeginparend/exemplo.js";

test("exemplo.ts: exploInicialParbeginParend parses successfully", () => {
  const tree = parser.parse(exploInicialParbeginParend);

  assert.ok(tree, "Should parse example code");
  assert.ok(!tree.cursor().type.isError, "Should not have parse errors");
});

test("exemplo.ts: exploInicialParbeginParend contains expected commands", () => {
  assert.ok(
    exploInicialParbeginParend.includes("A"),
    "Should contain command A",
  );
  assert.ok(
    exploInicialParbeginParend.includes("B"),
    "Should contain command B",
  );
  assert.ok(
    exploInicialParbeginParend.includes("C"),
    "Should contain command C",
  );
  assert.ok(
    exploInicialParbeginParend.includes("D"),
    "Should contain command D",
  );
  assert.ok(
    exploInicialParbeginParend.includes("E"),
    "Should contain command E",
  );
  assert.ok(
    exploInicialParbeginParend.includes("F"),
    "Should contain command F",
  );
});

test("exemplo.ts: exploInicialParbeginParend uses PARBEGIN/PAREND", () => {
  assert.ok(
    exploInicialParbeginParend.includes("PARBEGIN"),
    "Should use PARBEGIN keyword",
  );
  assert.ok(
    exploInicialParbeginParend.includes("PAREND"),
    "Should use PAREND keyword",
  );
  assert.ok(
    exploInicialParbeginParend.includes("BEGIN"),
    "Should use BEGIN keyword",
  );
  assert.ok(
    exploInicialParbeginParend.includes("END"),
    "Should use END keyword",
  );
});

test("exemplo.ts: exploInicialParbeginParend demonstrates educational content", () => {
  const tree = parser.parse(exploInicialParbeginParend);
  assert.ok(tree, "Should parse successfully for educational use");

  assert.ok(
    exploInicialParbeginParend.includes("BEGIN"),
    "Should demonstrate sequential blocks",
  );
  assert.ok(
    exploInicialParbeginParend.includes("PARBEGIN"),
    "Should demonstrate parallel blocks",
  );

  const commandPattern = /[A-Z];/g;
  const commands = exploInicialParbeginParend.match(commandPattern);
  assert.ok(
    commands && commands.length >= 6,
    "Should have multiple commands for demonstration",
  );
});
