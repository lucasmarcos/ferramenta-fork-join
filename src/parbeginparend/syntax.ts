import type { Tree } from "@lezer/common";

export interface GrammarError {
  type: "syntax-error" | "missing-semicolon";
  message: string;
  start: number;
  end: number;
}

export const checkSyntax = (tree: Tree): GrammarError[] => {
  const errors: GrammarError[] = [];
  const cursor = tree.cursor();

  const process = (parentName?: string, lastLabelEnd?: number) => {
    if (cursor.type.isError) {
      if (parentName === "Call" && lastLabelEnd !== undefined) {
        errors.push({
          type: "missing-semicolon",
          message: "Falta ponto e virgula",
          start: lastLabelEnd,
          end: lastLabelEnd,
        });
      } else {
        errors.push({
          type: "syntax-error",
          message: "Erro de sintaxe",
          start: cursor.from,
          end: cursor.to,
        });
      }
    }

    const nodeName = cursor.name;

    if (cursor.firstChild()) {
      let labelEnd: number | undefined;
      do {
        if (cursor.name === "Label") {
          labelEnd = cursor.to;
        }
        process(nodeName, labelEnd);
      } while (cursor.nextSibling());
      cursor.parent();
    }
  };

  process();

  return errors;
};
