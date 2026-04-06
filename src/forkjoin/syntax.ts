import type { Tree } from "@lezer/common";

export const checkSyntax = (tree: Tree) => {
  const errors: any[] = [];

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
