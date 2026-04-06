interface CommandNode {
  type: "call";
  id: string;
  label: string;
  child: unknown[];
}

interface ContainerNode {
  type: "seq" | "par";
  child: StackNode[];
}

export type StackNode = CommandNode | ContainerNode;

export const stackify = (ir: string[]): StackNode => {
  const stack: ContainerNode[] = [];
  let current: StackNode[] = [];

  for (const cmd of ir) {
    if (cmd === "[") {
      const node: ContainerNode = { type: "seq", child: current };
      stack.push(node);
      current = [];
    } else if (cmd === "(") {
      const node: ContainerNode = { type: "par", child: current };
      stack.push(node);
      current = [];
    } else if (cmd === "]" || cmd === ")") {
      const last = stack.pop();
      if (last) {
        const node: ContainerNode = { type: last.type, child: current };
        current = last.child;
        current.push(node);
      }
    } else {
      current.push({
        type: "call",
        id: crypto.randomUUID(),
        label: cmd,
        child: [],
      });
    }
  }

  return current[0];
};
