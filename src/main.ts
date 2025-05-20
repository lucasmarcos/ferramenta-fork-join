import type { CompletionContext } from "@codemirror/autocomplete";
import { indentWithTab } from "@codemirror/commands";
import {
  LRLanguage,
  LanguageSupport,
  foldGutter,
  foldNodeProp,
  foldService,
} from "@codemirror/language";
import { type Diagnostic, lintGutter, linter } from "@codemirror/lint";
import type { Severity } from "@codemirror/lint";
import type { EditorState } from "@codemirror/state";
import { EditorView, keymap } from "@codemirror/view";
import type { LRParser } from "@lezer/lr";
import { basicSetup } from "codemirror";
import graphviz from "graphviz-wasm";
import { Language, Parser, type Tree } from "web-tree-sitter";
import { parser as lezerParser } from "../src/lezerParser.js";
import { exemploInicial } from "./exemplo.js";
import { forkJoinHighlight } from "./highlight.js";
import { resolve } from "./resolve.js";
import { checkSyntax } from "./syntax.js";
import { type IError, treewalk } from "./treewalk.js";

// import { syntaxHighlighting } from "@codemirror/language";
// import { classHighlighter } from "@lezer/highlight";

let intErrors: IError[] = [];

let parser: Parser;
let ForkJoin: Language;

let lezerForkJoinParser: LRParser;

const editorView: HTMLElement = document.getElementById("editor");
const treeContainer: HTMLElement = document.getElementById("treeContainer");

let editor: EditorView;

/*
const pontoEVirgula = () => {
  if (parser && ForkJoin) {
    const ast = parser.parse(view.state.doc.toString());
    const errors = error(ast);
    for (const error of errors) {
      if (error.previousSibling) {
        diagnostics.push({
          from: error.previousSibling.startIndex,
          to: error.previousSibling.endIndex,
          message: "Faltando ponto e vírgula.",
          severity: "error",
          actions: [
            {
              name: "Adicionar",
              apply(view, from, to) {
                view.dispatch({ changes: { from: to, to: to, insert: ";" } });
              },
            },
          ],
        });
      }
    }
  }
};
*/

const lint = linter(
  (view: EditorView) => {
    intErrors = [];

    go(view);

    const diagnostics: Diagnostic[] = [];

    for (const intError of intErrors) {
      diagnostics.push({
        message: intError.message,
        severity: (intError.severity as Severity) || ("error" as Severity),
        from: intError.start || 0,
        to: intError.end || 0,
        actions: intError.actions,
      });
    }

    return diagnostics;
  },
  { delay: 0, autoPanel: true },
);

const errorFree = (ast: Tree) => {
  if (ForkJoin) {
    const queryError = ForkJoin.query("(ERROR)");
    const matchesError = queryError.matches(ast.rootNode);
    return matchesError.length === 0;
  }

  return intErrors.length === 0;
};

const checkSyntaxErrors = (ast: Tree) => {
  const errorQuery = ForkJoin.query("(ERROR)");
  const matchesError = errorQuery.matches(ast.rootNode);

  for (const match of matchesError) {
    // console.log(match.toString());
  }

  return matchesError.length === 0;
};

const go = (u: EditorView) => {
  const code = u.state.doc.toString();

  document.location.hash = encodeURI(code);

  if (!code) {
    return;
  }

  // console.log(lezerForkJoinParser.parse(code).children.toString());

  const tree = parser.parse(code);
  // console.log(tree.rootNode.toString());
  const s = checkSyntaxErrors(tree);
  const e = checkSyntax(tree);

  if (e.length !== 0) {
    intErrors = e;
  } else if (s) {
    const walked = treewalk(tree);
    const dot = resolve(walked.threads);

    intErrors = walked.errors;

    if (errorFree(tree)) {
      treeContainer.innerHTML = graphviz.layout(dot);
      treeContainer.style.opacity = "1";
      (treeContainer.children[0] as SVGElement).style.width =
        `${treeContainer.clientWidth * 0.9}px`;
      (treeContainer.children[0] as SVGElement).style.height =
        `${treeContainer.clientHeight * 0.9}px`;
    }
  }
};

const updated = EditorView.updateListener.of((update) => {
  if (update.docChanged) {
    treeContainer.style.opacity = "0.5";
  }
});

const share = decodeURI(document.location.hash.substring(1));
const code = share ? share : exemploInicial;

(async () => {
  await graphviz.loadWASM();
  console.log("loaded graphviz");

  await Parser.init(<any>{
    locateFile(url: string, dir: string) {
      return url;
    },
  });
  console.log("init tree-sitter");

  ForkJoin = await Language.load("tree-sitter-forkjoin.wasm");
  console.log("loaded parser");

  parser = new Parser();
  parser.setLanguage(ForkJoin);

  lezerForkJoinParser = lezerParser.configure({
    props: [
      forkJoinHighlight,
      foldNodeProp.add((type) => {
        if (type.name === "Def") {
          return (tree, state) => {
            return {
              from: 0,
              to: state.doc.length,
            };
          };
        }

        return null;
      }),
    ],
  });

  const forkJoinData = LRLanguage.define({
    name: "fork-join",
    parser: lezerForkJoinParser,
    languageData: {
      commentTokens: { line: "//" },
    },
  });

  const collectLabels = (state: EditorState) => {
    const doc = state.doc.toString();
    const tree = parser.parse(doc);
    const labels = new Set<string>();

    const traverse = (node) => {
      if (node.type === "label") {
        labels.add(node.text);
      }
      let child = node.firstChild;
      while (child) {
        traverse(child);
        child = child.nextSibling;
      }
    };

    traverse(tree.rootNode);
    return Array.from(labels).map((label) => ({
      label,
      type: "variable",
    }));
  };

  const forkJoinCompletions = (context: CompletionContext) => {
    const word = context.matchBefore(/[a-zA-Z_\'][a-zA-Z_\'0-9]*/);
    if (!word) return null;

    if (word.from === word.to && !context.explicit) return null;

    const options = [
      { label: "FORK", type: "keyword" },
      { label: "JOIN", type: "keyword" },
      ...collectLabels(context.state),
    ];

    return {
      from: word.from,
      options,
      validFor: /^[a-zA-Z_\'][a-zA-Z_\'0-9]*$/,
    };
  };

  const forkJoinLanguageSupport = new LanguageSupport(
    forkJoinData,
    forkJoinData.data.of({
      autocomplete: forkJoinCompletions,
    }),
  );

  const foldS = foldService.of((state, lineStart, lineEnd) => {
    const line = state.doc.lineAt(lineStart);
    const lineContent = line.text.trim();

    if (lineContent.match(/^[a-zA-Z_'][a-zA-Z_'0-9]*:/)) {
      const totalLines = state.doc.lines;
      let endLine = lineStart;

      for (let i = lineStart + 1; i <= totalLines; i++) {
        const nextLine = state.doc.line(i);
        const nextContent = nextLine.text.trim();
        if (nextContent.match(/^[a-zA-Z_'][a-zA-Z_'0-9]*:/)) {
          endLine = i - 1;
          break;
        }
        if (i === totalLines) {
          endLine = i;
        }
      }

      if (endLine > lineStart) {
        return {
          from: line.from,
          to: state.doc.line(endLine).to,
        };
      }
    }

    return null;
  });

  editor = new EditorView({
    extensions: [
      lintGutter(),
      basicSetup,
      keymap.of([indentWithTab]),
      lint,
      forkJoinLanguageSupport,
      foldGutter(),
      foldS,
      updated,
    ],
    parent: editorView,
    doc: code,
  });
})();

const forkJoinCompletions = (context: CompletionContext) => {
  return {};
};

(<any>window).dumpState = () => {
  const code = editor.state.doc.toString();
  const ast = parser.parse(code);
  const walked = treewalk(ast);
  const solved = resolve(walked.threads);

  console.log(ast.rootNode.toString());
  console.log(walked);
  console.log(solved);
};
