import { indentWithTab } from "@codemirror/commands";
import {
  foldService,
  indentOnInput,
  LanguageSupport,
  LRLanguage,
} from "@codemirror/language";
import { linter, lintGutter } from "@codemirror/lint";
import { Compartment, Prec } from "@codemirror/state";
import { EditorView, keymap } from "@codemirror/view";
import type { NodePropSource, Tree } from "@lezer/common";
import { basicSetup } from "codemirror";
import { exampleForkJoin } from "./forkjoin/example.js";
import { forkJoinHighlight } from "./forkjoin/highlight.js";
import { lintForkJoin } from "./forkjoin/lint.js";
import { parser as forkJoinParser } from "./forkjoin/parser.js";
import { resolve as resolveForkJoin } from "./forkjoin/resolve.js";
import { treewalk as treewalkForkJoin } from "./forkjoin/treewalk.js";
import type { GraphElement } from "./graph.js";
import { renderGraph } from "./graph.js";
import { exampleParbeginParend } from "./parbeginparend/example.js";
import { parBeginParEndHighlight } from "./parbeginparend/highlight.js";
import { interpret as interpretParbeginParend } from "./parbeginparend/interpret.js";
import { parse as parseParbeginParend } from "./parbeginparend/ir.js";
import { parser as parbeginParendParser } from "./parbeginparend/parser.js";
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
  document.location.hash = `${encodeURIComponent(currentMode)}|${encodeURIComponent(code)}`;
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

const foldBlocks = foldService.of((state, from, _to) => {
  const line = state.doc.lineAt(from);
  const text = line.text.trim();

  if (!text.endsWith(":")) return null;

  const startLine = line.number;
  const endLineNum = state.doc.lines;

  let foldEnd = line.to;
  for (let i = startLine + 1; i <= endLineNum; i++) {
    const nextLine = state.doc.line(i);
    const nextText = nextLine.text.trim();
    if (nextText.endsWith(":") && !nextText.startsWith("//")) {
      foldEnd = state.doc.line(i - 1).to;
      break;
    }
    foldEnd = nextLine.to;
  }

  if (foldEnd <= line.to) return null;

  return { from: line.to, to: foldEnd - 1 };
});

const initial = parseHash();
currentMode = initial.mode;
modeSelect.value = currentMode;

const insertNewlineAndIndent = (view: EditorView): boolean => {
  const { state } = view;
  const { from } = state.selection.main;
  const line = state.doc.lineAt(from);
  const lineText = line.text;
  const indent = lineText.match(/^(\s*)/)?.[1] || "";
  const trimmed = lineText.trim();

  const extraIndent = trimmed.endsWith(":") ? "  " : "";

  view.dispatch({
    changes: { from, insert: `\n${indent}${extraIndent}` },
    selection: { anchor: from + 1 + indent.length + extraIndent.length },
  });

  return true;
};

editor = new EditorView({
  extensions: [
    basicSetup,
    Prec.highest(keymap.of([{ key: "Enter", run: insertNewlineAndIndent }])),
    keymap.of([indentWithTab]),
    indentOnInput(),
    languageConf.of(getLanguageSupport(currentMode)),
    lint,
    lintGutter(),
    foldBlocks,
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
