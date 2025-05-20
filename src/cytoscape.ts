import cytoscape from "cytoscape";
import dagre from "cytoscape-dagre";

cytoscape.use(dagre);

export const toCytoscape = (graph) => {
  return cytoscape({
    elements: graph.elements,
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
