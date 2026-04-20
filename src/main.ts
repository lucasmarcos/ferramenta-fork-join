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
import type { ElementsDefinition } from "cytoscape";
import type { DagreLayoutOptions } from "cytoscape-dagre";
import { forkJoinHighlight } from "./forkjoin/highlight.js";
import { lintForkJoin } from "./forkjoin/lint.js";
import { parser as forkJoinParser } from "./forkjoin/parser.js";
import { resolve as resolveForkJoin } from "./forkjoin/resolve.js";
import { treewalk as treewalkForkJoin } from "./forkjoin/treewalk.js";
import { renderGraph } from "./graph.js";
import { parBeginParEndHighlight } from "./parbeginparend/highlight.js";
import { interpret as interpretParbeginParend } from "./parbeginparend/interpret.js";
import { parse as parseParbeginParend } from "./parbeginparend/ir.js";
import { lintParBeginParEnd } from "./parbeginparend/lint.js";
import { parser as parbeginParendParser } from "./parbeginparend/parser.js";
import { stackify as stackifyParbeginParend } from "./parbeginparend/stack.js";

type Mode = "fork-join" | "parbegin-parend";
const currentMode: Mode = "fork-join";

const editorViewElement = document.getElementById("editor") as HTMLElement;
const solutionContainer = document.getElementById("solution") as HTMLElement;
const resultContainer = document.getElementById("result") as HTMLElement;

let editor: EditorView;
const languageConf = new Compartment();

let lastLintHadErrors = false;

const parseHash = (): number => {
  const hash = document.location.hash.substring(1);
  if (!hash) return 0;
  return parseInt(hash, 10);
};

const solutionCode = [
  `
  A;
  B;
  C;
`,

  `
  A;
  FORK ROT_C;
  B;

  ROT_C: C;
`,
  `
  VAR_D = 2;

  A;
  FORK ROT_C;
  B;
  JOIN VAR_D, ROT_D, QUIT;

  ROT_C:
    C;
    JOIN VAR_D, ROT_D, QUIT;

  ROT_D:
    D;
`,
  `
VAR_A = 2;
VAR_B = 3;
VAR_C = 2;
VAR_D = 4;

START;
LOAD_DATA;
FORK WORKER_A1;
PROCESS_MAIN;
JOIN VAR_A, STAGE_3, QUIT;

WORKER_A1:
  PROCESS_A1;
  JOIN VAR_A, STAGE_3, QUIT;

STAGE_3:
  COMBINE_A;
  FORK WORKER_B1;
  FORK WORKER_B2;
  PROCESS_B_MAIN;
  JOIN VAR_B, STAGE_4, QUIT;

WORKER_B1:
  TASK_B1_1;
  TASK_B1_2;
  JOIN VAR_B, STAGE_4, QUIT;

WORKER_B2:
  TASK_B2_1;
  JOIN VAR_B, STAGE_4, QUIT;

STAGE_4:
  AGGREGATE_B;
  FORK NESTED_PATH;
  DIRECT_PATH;
  JOIN VAR_C, STAGE_5, QUIT;

NESTED_PATH:
  NESTED_1;
  FORK DEEP_1;
  FORK DEEP_2;
  FORK DEEP_3;
  NESTED_2;
  JOIN VAR_D, NESTED_MERGE, QUIT;

DEEP_1:
  DEEP_TASK_1;
  JOIN VAR_D, NESTED_MERGE, QUIT;

DEEP_2:
  DEEP_TASK_2;
  JOIN VAR_D, NESTED_MERGE, QUIT;

DEEP_3:
  DEEP_TASK_3;
  JOIN VAR_D, NESTED_MERGE, QUIT;

NESTED_MERGE:
  NESTED_DONE;
  JOIN VAR_C, STAGE_5, QUIT;

STAGE_5:
  FINALIZE;
  SAVE_RESULTS;
  QUIT;
`,
];

const cyto = renderGraph(resultContainer, { nodes: [], edges: [] });

const level = parseHash();

const getModeData = (mode: Mode) => {
  if (mode === "fork-join") {
    return {
      parser: forkJoinParser,
      name: "fork-join",
    };
  }
  return {
    parser: parbeginParendParser,
    name: "parbegin-parend",
  };
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

    const result = lintParBeginParEnd(code);
    lastLintHadErrors = result.hasErrors;
    return result.diagnostics;
  },
  { autoPanel: true },
);

let resolved: ElementsDefinition = { nodes: [], edges: [] };

const compare = (
  solution: ElementsDefinition,
  result: ElementsDefinition,
): boolean => {
  const solutionNodes = solution.nodes.map((n) => n.data.label);
  const resultNodes = result.nodes.map((n) => n.data.label);

  const solutionEdges = solution.edges.map(
    (e) =>
      `${solution.nodes.find((n) => n.data.id === e.data.source)?.data.label}:${solution.nodes.find((n) => n.data.id === e.data.target)?.data.label}`,
  );
  const resultEdges = result.edges.map(
    (e) =>
      `${result.nodes.find((n) => n.data.id === e.data.source)?.data.label}:${result.nodes.find((n) => n.data.id === e.data.target)?.data.label}`,
  );

  return (
    solutionNodes.length === resultNodes.length &&
    solutionEdges.length === resultEdges.length &&
    solutionNodes.every((val, index) => val === resultNodes[index]) &&
    solutionEdges.every((val, index) => val === resultEdges[index])
  );
};

const go = () => {
  const code = editor.state.doc.toString();
  if (!code) return;

  let elements: ElementsDefinition = { nodes: [], edges: [] };

  if (currentMode === "fork-join") {
    const tree = forkJoinParser.parse(code);
    if (errorFree(tree)) {
      const walked = treewalkForkJoin(code, tree);
      elements = resolveForkJoin(walked.threads);
    }
  } else {
    const tree = parbeginParendParser.parse(code);
    if (errorFree(tree)) {
      const ir = parseParbeginParend(code, tree);
      const stack = stackifyParbeginParend(ir);
      elements = interpretParbeginParend(stack);
    }
  }

  if (compare(resolved, elements)) {
    resultContainer.style.border = "solid green";
  } else {
    resultContainer.style.border = "solid red";
  }

  if (elements.nodes.length > 0) {
    cyto.json({ elements });
    cyto.layout({ name: "dagre", animate: true } as DagreLayoutOptions).run();
  }
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
});

const goToLevel = (level: number) => {
  const parsed = forkJoinParser.parse(solutionCode[level - 1]);
  const threads = treewalkForkJoin(solutionCode[level - 1], parsed);
  resolved = resolveForkJoin(threads.threads);
  renderGraph(solutionContainer, resolved);
  go();
};

addEventListener("hashchange", (_event) => {
  location.reload();
});

if (level !== 0) {
  goToLevel(level);
} else {
  document.body.innerHTML = `
    <ul>
      <li>
        <a href="#1">fase 1</a>
      </li>
      <li>
        <a href="#2">fase 2</a>
      </li>
      <li>
        <a href="#3">fase 3</a>
      </li>
      <li>
        <a href="#4">fase 4</a>
      </li>
    </ul>
  `;
}
