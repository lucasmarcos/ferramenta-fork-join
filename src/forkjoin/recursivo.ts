export const recursivo = (blockMap: Map<string, any[]>) => {
  const calls = new Map<string, Set<string>>();

  for (const blockName of blockMap.keys()) {
    const callsSet = new Set<string>();
    const block = blockMap.get(blockName);
    if (block) {
      for (const cmd of block) {
        if (cmd.name === "Call") {
          const labelNode = cmd.children.find((c: any) => c.name === "Label");
          if (labelNode) {
            callsSet.add(labelNode.text);
          }
        }
      }
    }
    calls.set(blockName, callsSet);
  }

  // Basic cycle detection or just returning
  return calls;
};
