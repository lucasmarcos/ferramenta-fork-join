import type { ElementsDefinition } from "cytoscape";
import type { StackNode } from "./stack.js";

export const interpret = (stack: StackNode): ElementsDefinition => {
  const elements: ElementsDefinition = { nodes: [], edges: [] };

  const process = (
    node: StackNode,
    dependsOn: StackNode[] = [],
  ): StackNode[] => {
    if (!node) return [];

    if (node.type === "call") {
      elements.nodes.push({ data: { id: node.id, label: node.label } });

      for (const source of dependsOn) {
        if (source.type === "call") {
          elements.edges.push({ data: { source: source.id, target: node.id } });
        }
      }

      return [node];
    }

    if (node.type === "seq") {
      let currentDeps = [...dependsOn];

      if (Array.isArray(node.child)) {
        for (const childNode of node.child) {
          currentDeps = process(childNode, currentDeps);
        }
      }

      return currentDeps;
    }

    if (node.type === "par") {
      let allOutputs: StackNode[] = [];

      if (Array.isArray(node.child)) {
        for (const branch of node.child) {
          const branchOutputs = process(branch, dependsOn);
          allOutputs = [...allOutputs, ...branchOutputs];
        }
      }

      return allOutputs;
    }

    return dependsOn;
  };

  process(stack);

  return elements;
};
