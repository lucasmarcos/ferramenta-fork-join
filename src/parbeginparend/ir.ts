import type { Tree } from "@lezer/common";

export const parse = (doc: string, tree: Tree) => {
  const q: string[] = [];
  const ir: string[] = [];

  const cursor = tree.cursor();
  do {
    switch (cursor.name) {
      case "Begin": {
        q.push("begin");
        ir.push("[");
        break;
      }
      case "End": {
        const last = q.pop();
        if (last !== "begin") {
          console.log("error");
        }
        ir.push("]");
        break;
      }
      case "ParBegin": {
        q.push("parbegin");
        ir.push("(");
        break;
      }
      case "ParEnd": {
        const last = q.pop();
        if (last !== "parbegin") {
          console.log("error");
        }
        ir.push(")");
        break;
      }
      case "Call": {
        cursor.firstChild();
        ir.push(doc.substring(cursor.from, cursor.to));
        cursor.parent();
        break;
      }
    }
  } while (cursor.next());

  return ir;
};
