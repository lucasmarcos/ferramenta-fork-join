import cytoscape from "cytoscape";
import dagre from "cytoscape-dagre";

cytoscape.use(dagre);

export const cytoscapeStyle: cytoscape.Stylesheet[] = [
  {
    selector: "node",
    style: {
      label: "data(label)",
      "background-color": "white",
      "border-width": 1,
      "text-halign": "center",
      "text-valign": "center",
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
];

export const renderGraph = (container: HTMLElement, elements: any[]) => {
  return cytoscape({
    container,
    elements,
    layout: { name: "dagre" },
    style: cytoscapeStyle,
  });
};
