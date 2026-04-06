import fs from "node:fs";
import path from "node:path";
import { test } from "node:test";
import { fileTests } from "@lezer/generator/dist/test";
// @ts-expect-error
import { parser as parbeginParendParser } from "../out/parBeginParEndParser.js";

const corpusDir = "test/grammar/parbeginparend/corpus";

for (const file of fs.readdirSync(corpusDir)) {
  if (!file.endsWith(".txt")) continue;

  const content = fs.readFileSync(path.join(corpusDir, file), "utf8");

  for (const { name, run } of fileTests(content, file)) {
    test(`ParBegin Grammar: ${file} - ${name}`, () =>
      run(parbeginParendParser));
  }
}
