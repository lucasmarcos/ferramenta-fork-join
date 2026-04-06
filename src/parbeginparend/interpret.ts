import type { StackNode } from "./stack.js";

export const interpret = (stack: StackNode) => {
  const elements: any[] = [];

  const process = (
    node: StackNode,
    dependsOn: StackNode[] = [],
  ): StackNode[] => {
    if (!node) return [];

    switch (node.type) {
      case "call":
        elements.push({ data: { id: node.id, label: node.label } });

        for (const source of dependsOn) {
          elements.push({ data: { source: source.id, target: node.id } });
        }

        return [node];

      case "seq": {
        let currentDeps = [...dependsOn];

        if (Array.isArray(node.child)) {
          for (const childNode of node.child) {
            currentDeps = process(childNode, currentDeps);
          }
        }

        return currentDeps;
      }

      case "par": {
        let allOutputs: StackNode[] = [];

        if (Array.isArray(node.child)) {
          for (const branch of node.child) {
            const branchOutputs = process(branch, dependsOn);
            allOutputs = [...allOutputs, ...branchOutputs];
          }
        }

        return allOutputs;
      }

      default: {
        return dependsOn;
      }
    }
  };

  process(stack);

  return elements;
};
