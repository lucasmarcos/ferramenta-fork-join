import type { Node } from "web-tree-sitter";

export const recursivo = (blockMap: Map<string, Node[]>) => {
  const callMap: Map<string, Set<string>> = new Map();

  for (const blockName of blockMap.keys()) {
    if (blockName) {
      const callsSet: Set<string> = new Set();

      for (const call of blockMap.get(blockName)) {
        if (call.type === "call") {
          callsSet.add(call.child(0).text);
        }
      }

      callMap.set(blockName, callsSet);
    }
  }

  for (const [k, v] of callMap) {
    for (const c of v) {
      const theOther = callMap.get(c);
      if (theOther) {
        if (theOther.has(k)) {
          return true;
        }
      }
    }
  }

  return false;
};
