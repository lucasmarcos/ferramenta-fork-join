import { indentWithTab, insertNewlineKeepIndent } from "@codemirror/commands";
import {
  foldGutter,
  foldNodeProp,
  indentNodeProp,
  indentOnInput,
  LanguageSupport,
  LRLanguage,
} from "@codemirror/language";
import { linter, lintGutter } from "@codemirror/lint";
import { Compartment } from "@codemirror/state";
import { EditorView, keymap } from "@codemirror/view";
import type { NodePropSource, Tree } from "@lezer/common";
import { basicSetup } from "codemirror";
import { parser as forkJoinParser } from "./forkJoinParser.js";
import { exampleForkJoin } from "./forkjoin/example.js";
import { forkJoinHighlight } from "./forkjoin/highlight.js";
import { lintForkJoin } from "./forkjoin/lint.js";
import { resolve as resolveForkJoin } from "./forkjoin/resolve.js";
import { treewalk as treewalkForkJoin } from "./forkjoin/treewalk.js";
import type { GraphElement } from "./graph.js";
import { renderGraph } from "./graph.js";
import { parser as parbeginParendParser } from "./parBeginParEndParser.js";
import { exampleParbeginParend } from "./parbeginparend/example.js";
import { parBeginParEndHighlight } from "./parbeginparend/highlight.js";
import { interpret as interpretParbeginParend } from "./parbeginparend/interpret.js";
import { parse as parseParbeginParend } from "./parbeginparend/ir.js";
import { stackify as stackifyParbeginParend } from "./parbeginparend/stack.js";

type Mode = "fork-join" | "parbegin-parend";
let currentMode: Mode = "fork-join";

const editorViewElement = document.getElementById("editor") as HTMLElement;
const graphContainer = document.getElementById("graph") as HTMLElement;
const modeSelect = document.getElementById("mode-select") as HTMLSelectElement;

let editor: EditorView;
const languageConf = new Compartment();

let lastLintHadErrors = false;

const getModeData = (mode: Mode) => {
  if (mode === "fork-join") {
    return {
      parser: forkJoinParser,
      example: exampleForkJoin,
      name: "fork-join",
    };
  }
  return {
    parser: parbeginParendParser,
    example: exampleParbeginParend,
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
    mode === "fork-join" ? forkJoinHighlight : parBeginParEndHighlight,
    foldNodeProp.add({
      Def: (tree, _state) => ({ from: tree.from, to: tree.to }),
      Begin: (tree, _state) => ({ from: tree.from, to: tree.to }),
    }),
    indentNodeProp.add({
      Program: (context) => {
        const prevLine = context.lineAt(context.pos, -1);
        const match = prevLine.text.match(/^(\s*)/);
        return match ? match[1].length : 0;
      },
    }),
  ].filter((p): p is NodePropSource => p !== null);

  const lezerParser = data.parser.configure({ props });

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
  return process() && !lastLintHadErrors;
};

const lint = linter(
  (view) => {
    const code = view.state.doc.toString();

    if (currentMode === "fork-join") {
      const result = lintForkJoin(code);
      lastLintHadErrors = result.hasErrors;
      return result.diagnostics;
    }

    lastLintHadErrors = false;
    return [];
  },
  { autoPanel: true },
);

const go = () => {
  const code = editor.state.doc.toString();
  document.location.hash = encodeURIComponent(currentMode) + "|" + encodeURIComponent(code);
  if (!code) return;

  let elements: GraphElement[] = [];

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

const parseHash = (): { mode: Mode; code: string } => {
  const hash = document.location.hash.substring(1);
  if (!hash) return { mode: "fork-join", code: exampleForkJoin };

  const pipeIndex = hash.indexOf("|");
  if (pipeIndex === -1) {
    return { mode: "fork-join", code: decodeURIComponent(hash) };
  }

  const mode = decodeURIComponent(hash.substring(0, pipeIndex)) as Mode;
  const code = decodeURIComponent(hash.substring(pipeIndex + 1));

  if (mode !== "fork-join" && mode !== "parbegin-parend") {
    return { mode: "fork-join", code };
  }

  return { mode, code };
};

const initial = parseHash();
currentMode = initial.mode;
modeSelect.value = currentMode;

editor = new EditorView({
  extensions: [
    basicSetup,
    keymap.of([
      indentWithTab,
      { key: "Enter", run: insertNewlineKeepIndent },
    ]),
    indentOnInput(),
    languageConf.of(getLanguageSupport(currentMode)),
    lint,
    lintGutter(),
    foldGutter(),
    EditorView.updateListener.of((update) => {
      if (update.docChanged) go();
    }),
  ],
  parent: editorViewElement,
  doc: initial.code,
});

modeSelect.onchange = () => {
  switchMode(modeSelect.value as Mode);
};

go();
