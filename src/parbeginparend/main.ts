import { EditorView } from "@codemirror/view";
import { basicSetup } from "codemirror";
import cytoscape from "cytoscape";
import dagre from "cytoscape-dagre";
import { parser } from "../../out/parBeginParEndParser.js";
import { example } from "./example.js";
import { interpret } from "./interpret.js";
import { parse } from "./ir.js";
import { stackify } from "./stack.js";

cytoscape.use(dagre);

const editorView: HTMLElement = document.getElementById("editor");
const treeContainer: HTMLElement = document.getElementById("treeContainer");

const go = (doc) => {
  const tree = parser.parse(doc);
  const ir = parse(doc, tree);
  const stack = stackify(ir);
  const graph = interpret(stack);

  cytoscape({
    container: treeContainer,
    elements: graph,
    layout: { name: "dagre" },
    style: [
      {
        selector: "node",
        style: {
          label: "data(label)",
          "background-color": "white",
          "border-width": 1,
        },
      },
      {
        selector: "edge",
        style: {
          "curve-style": "straight",
          "target-arrow-shape": "triangle",
          "target-arrow-color": "black",
          "line-color": "black",
          width: 1,
        },
      },
      {
        selector: "label",
        style: {
          "text-halign": "center",
          "text-valign": "center",
        },
      },
    ],
  });
};

const update = EditorView.updateListener.of((update) => {
  if (update.docChanged) {
    const doc = update.state.doc.toString();
    document.location.hash = encodeURI(doc);
    go(doc);
  }
});

const share = decodeURI(document.location.hash.substring(1));
const code = share ? share : example;

new EditorView({
  extensions: [basicSetup, update],
  parent: editorView,
  doc: code,
});

go(code);
