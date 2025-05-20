import assert from "node:assert";
import { test } from "node:test";

import { Language, Parser } from "web-tree-sitter";

import { exemploInicial } from "../out/exemplo.js";
import { treewalk } from "../out/treewalk.js";

test("carregamento", async (t) => {
  await Parser.init();
  const ForkJoin = await Language.load("tree-sitter-forkjoin.wasm");
  const parser = new Parser();
  parser.setLanguage(ForkJoin);

  assert.ok(parser);
  //assert.ok(parser.getLanguage());

  t.test("exemplo inicial", (t) => {
    const input = exemploInicial;
    const parseTree = parser.parse(input);
    const output = treewalk(parseTree);
    assert.ok(output);
    assert.deepEqual(output.errors, []);
  });

  t.test("variavel de controle com valor errado", (t) => {});

  t.test("variavel de controle com valor correto", (t) => {});

  t.test("exemplo complexo", (t) => {});

  t.test("fork linha", (t) => {});

  t.test("fork linha aninhado", (t) => {});

  t.test("dois joins seguidos", (t) => {});
});
