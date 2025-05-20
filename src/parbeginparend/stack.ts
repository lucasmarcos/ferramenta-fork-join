export const stackify = (ir) => {
  const stack = [];
  let current = [];

  for (const cmd of ir) {
    if (cmd === "[") {
      const node = { type: "seq", child: current };
      stack.push(node);
      current = [];
    } else if (cmd === "(") {
      const node = { type: "par", child: current };
      stack.push(node);
      current = [];
    } else if (cmd === "]" || cmd === ")") {
      const last = stack.pop();
      const node = { type: last.type, child: current };
      current = last.child;
      current.push(node);
    } else {
      current.push({ type: "call", id: crypto.randomUUID(), label: cmd });
    }
  }

  return current[0];
};
