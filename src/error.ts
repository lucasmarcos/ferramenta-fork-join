import type { Tree } from "@lezer/common";

export const error = (tree: Tree) => {
  const out: any[] = [];
  const cursor = tree.cursor();

  const process = () => {
    if (cursor.type.isError) {
      out.push({ from: cursor.from, to: cursor.to });
    }

    if (cursor.firstChild()) {
      do {
        process();
      } while (cursor.nextSibling());
      cursor.parent();
    }
  };

  process();

  return out;
};
