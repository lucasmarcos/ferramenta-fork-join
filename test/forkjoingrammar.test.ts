import { fileTests } from "@lezer/generator/dist/test";
import { parser as forkJoinParser } from "../out/forkJoinParser.js";
import fs from "node:fs";
import path from "node:path";
import { test } from "node:test";

const corpusDir = "test/grammar/forkjoin/corpus";

for (const file of fs.readdirSync(corpusDir)) {
  if (!file.endsWith(".txt")) continue;

  const content = fs.readFileSync(path.join(corpusDir, file), "utf8");

  for (const {name, run} of fileTests(content, file)) {
    test(name, () => run(forkJoinParser));
  }
}
