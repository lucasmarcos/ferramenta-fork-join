import { indentWithTab } from "@codemirror/commands";
import {
  foldGutter,
  foldNodeProp,
  LanguageSupport,
  LRLanguage,
} from "@codemirror/language";
import { type Diagnostic, linter, lintGutter } from "@codemirror/lint";
import { Compartment } from "@codemirror/state";
import { EditorView, keymap } from "@codemirror/view";
import type { Tree } from "@lezer/common";
import { basicSetup } from "codemirror";

import { parser as forkJoinParser } from "./forkJoinParser.js";
import { exemploInicialForkJoin } from "./forkjoin/exemplo.js";
import { resolve as resolveForkJoin } from "./forkjoin/resolve.js";
import { checkSyntax as checkSyntaxForkJoin } from "./forkjoin/syntax.js";
import {
  type IError,
  treewalk as treewalkForkJoin,
} from "./forkjoin/treewalk.js";
import { renderGraph } from "./graph.js";
import { forkJoinHighlight } from "./highlight.js";
import { parser as parbeginParendParser } from "./parBeginParEndParser.js";
import { exploInicialParbeginParend } from "./parbeginparend/exemplo.js";
import { interpret as interpretParbeginParend } from "./parbeginparend/interpret.js";
import { parse as parseParbeginParend } from "./parbeginparend/ir.js";
import { stackify as stackifyParbeginParend } from "./parbeginparend/stack.js";

type Mode = "fork-join" | "parbegin-parend";
let currentMode: Mode = "fork-join";

const editorViewElement = document.getElementById("editor")!;
const graphContainer = document.getElementById("graph")!;
const modeSelect = document.getElementById("mode-select") as HTMLSelectElement;

let editor: EditorView;
const languageConf = new Compartment();

let intErrors: IError[] = [];

const getModeData = (mode: Mode) => {
  if (mode === "fork-join") {
    return {
      parser: forkJoinParser,
      example: exemploInicialForkJoin,
      name: "fork-join",
    };
  }
  return {
    parser: parbeginParendParser,
    example: exploInicialParbeginParend,
    name: "parbegin-parend",
  };
};

const switchMode = (mode: Mode) => {
  currentMode = mode;
  const data = getModeData(mode);

  editor.dispatch({
    effects: languageConf.reconfigure(getLanguageSupport(mode)),
    changes: { from: 0, to: editor.state.doc.length, insert: data.example },
  });

  go();
};

const getLanguageSupport = (mode: Mode) => {
  const data = getModeData(mode);

  const props = [
    mode === "fork-join" ? forkJoinHighlight : null,
    foldNodeProp.add({
      Def: (tree, _state) => ({ from: tree.from, to: tree.to }),
      Begin: (tree, _state) => ({ from: tree.from, to: tree.to }),
    }),
  ].filter((p) => p !== null);

  const lezerParser = data.parser.configure({ props: props as any });

  const lang = LRLanguage.define({
    name: data.name,
    parser: lezerParser,
    languageData: { commentTokens: { line: "//" } },
  });

  return new LanguageSupport(lang);
};

const errorFree = (tree: Tree) => {
  const cursor = tree.cursor();
  const process = (): boolean => {
    if (cursor.type.isError) return false;
    if (cursor.firstChild()) {
      do {
        if (!process()) return false;
      } while (cursor.nextSibling());
      cursor.parent();
    }
    return true;
  };
  return process() && intErrors.length === 0;
};

const lint = linter((view) => {
  const code = view.state.doc.toString();
  const diagnostics: Diagnostic[] = [];
  intErrors = [];

  if (currentMode === "fork-join") {
    const tree = forkJoinParser.parse(code);
    const syntaxErrors = checkSyntaxForkJoin(tree);

    if (syntaxErrors.length > 0) {
      for (const err of syntaxErrors) {
        diagnostics.push({
          message: err.message,
          severity: "error",
          from: err.start || 0,
          to: err.end || 0,
        });
      }
    } else {
      const walked = treewalkForkJoin(code, tree);
      intErrors = walked.errors;
      for (const err of walked.errors) {
        diagnostics.push({
          message: err.message,
          severity: (err.severity as any) || "error",
          from: err.start || 0,
          to: err.end || 0,
        });
      }
    }
  }

  return diagnostics;
});

const go = () => {
  const code = editor.state.doc.toString();
  document.location.hash = encodeURI(code);
  if (!code) return;

  let elements: any[] = [];

  if (currentMode === "fork-join") {
    const tree = forkJoinParser.parse(code);
    if (errorFree(tree)) {
      const walked = treewalkForkJoin(code, tree);
      elements = resolveForkJoin(walked.threads);
    }
  } else {
    const tree = parbeginParendParser.parse(code);
    const ir = parseParbeginParend(code, tree);
    const stack = stackifyParbeginParend(ir);
    elements = interpretParbeginParend(stack);
  }

  if (elements.length > 0) {
    renderGraph(graphContainer, elements);
  }
};

// Initialization
const initialCode =
  decodeURI(document.location.hash.substring(1)) || exemploInicialForkJoin;

editor = new EditorView({
  extensions: [
    basicSetup,
    keymap.of([indentWithTab]),
    languageConf.of(getLanguageSupport(currentMode)),
    lint,
    lintGutter(),
    foldGutter(),
    EditorView.updateListener.of((update) => {
      if (update.docChanged) go();
    }),
  ],
  parent: editorViewElement,
  doc: initialCode,
});

modeSelect.onchange = () => {
  switchMode(modeSelect.value as Mode);
};

go();
