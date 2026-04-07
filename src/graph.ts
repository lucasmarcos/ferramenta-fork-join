import type { ElementsDefinition } from "cytoscape";
import cytoscape from "cytoscape";
import dagre from "cytoscape-dagre";

cytoscape.use(dagre);

export interface GraphElement {
  data: {
    id?: string;
    label?: string;
    source?: string;
    target?: string;
  };
}

export const renderGraph = (
  container: HTMLElement,
  elements: ElementsDefinition,
) => {
  return cytoscape({
    container,
    elements,
    layout: { name: "dagre" },
    style: [
      {
        selector: "node",
        style: {
          label: "data(label)",
          shape: "ellipse",
          "background-color": "white",
          "border-width": 1,
          "text-halign": "center",
          "text-valign": "center",
          width: "label",
          height: "label",
          padding: "8px",
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
    ],
  });
};
