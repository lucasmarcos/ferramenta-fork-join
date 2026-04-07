import type { Tree } from "@lezer/common";

export interface ValidationIssue {
  type:
    | "empty-sequential-block"
    | "empty-parallel-block"
    | "missing-end"
    | "missing-parend";
  message: string;
  start: number;
  end: number;
  severity: "warning";
  insertText?: string;
}

interface BlockState {
  type: "begin" | "parbegin";
  start: number;
  childCount: number;
}

export const validateStructure = (tree: Tree): ValidationIssue[] => {
  const issues: ValidationIssue[] = [];
  const stack: BlockState[] = [];
  const cursor = tree.cursor();

  do {
    switch (cursor.name) {
      case "Begin": {
        if (stack.length > 0) {
          stack[stack.length - 1].childCount += 1;
        }
        stack.push({ type: "begin", start: cursor.from, childCount: 0 });
        break;
      }

      case "ParBegin": {
        if (stack.length > 0) {
          stack[stack.length - 1].childCount += 1;
        }
        stack.push({ type: "parbegin", start: cursor.from, childCount: 0 });
        break;
      }

      case "Call": {
        if (stack.length > 0) {
          stack[stack.length - 1].childCount += 1;
        }
        break;
      }

      case "End": {
        const last = stack.pop();
        if (last?.type === "begin" && last.childCount === 0) {
          issues.push({
            type: "empty-sequential-block",
            message: "Bloco sequencial vazio",
            start: last.start,
            end: cursor.to,
            severity: "warning",
          });
        }
        break;
      }

      case "ParEnd": {
        const last = stack.pop();
        if (last?.type === "parbegin" && last.childCount === 0) {
          issues.push({
            type: "empty-parallel-block",
            message: "Bloco paralelo vazio",
            start: last.start,
            end: cursor.to,
            severity: "warning",
          });
        }
        break;
      }
    }
  } while (cursor.next());

  while (stack.length > 0) {
    const last = stack.pop();
    if (!last) break;

    issues.push({
      type: last.type === "begin" ? "missing-end" : "missing-parend",
      message:
        last.type === "begin"
          ? "Bloco BEGIN sem END"
          : "Bloco PARBEGIN sem PAREND",
      start: last.start,
      end: last.start,
      severity: "warning",
      insertText: last.type === "begin" ? "\nEND" : "\nPAREND",
    });
  }

  return issues;
};
