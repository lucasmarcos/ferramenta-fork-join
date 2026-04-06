import type { Tree } from "@lezer/common";

interface SyntaxError {
  message: string;
  start: number;
  end: number;
}

export const checkSyntax = (tree: Tree): SyntaxError[] => {
  const errors: SyntaxError[] = [];

  const cursor = tree.cursor();

  const process = () => {
    if (cursor.type.isError) {
      errors.push({
        message: "Erro de sintaxe",
        start: cursor.from,
        end: cursor.to,
      });
    }

    if (cursor.firstChild()) {
      do {
        process();
      } while (cursor.nextSibling());
      cursor.parent();
    }
  };

  process();

  return errors;
};
