export interface StackNode {
  type: string;
  child: StackNode[] | any[];
  id?: string;
  label?: string;
}

export const stackify = (ir: string[]): StackNode => {
  const stack: StackNode[] = [];
  let current: StackNode[] = [];

  for (const cmd of ir) {
    if (cmd === "[") {
      const node: StackNode = { type: "seq", child: current };
      stack.push(node);
      current = [];
    } else if (cmd === "(") {
      const node: StackNode = { type: "par", child: current };
      stack.push(node);
      current = [];
    } else if (cmd === "]" || cmd === ")") {
      const last = stack.pop();
      if (last) {
        const node: StackNode = { type: last.type, child: current };
        current = last.child as StackNode[];
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
