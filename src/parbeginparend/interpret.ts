import type { StackNode } from "./stack.js";

interface GraphElement {
  data: {
    id?: string;
    label?: string;
    source?: string;
    target?: string;
  };
}

export const interpret = (stack: StackNode): GraphElement[] => {
  const elements: GraphElement[] = [];

  const process = (
    node: StackNode,
    dependsOn: StackNode[] = [],
  ): StackNode[] => {
    if (!node) return [];

    if (node.type === "call") {
      elements.push({ data: { id: node.id, label: node.label } });

      for (const source of dependsOn) {
        if (source.type === "call") {
          elements.push({ data: { source: source.id, target: node.id } });
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
