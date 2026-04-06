import type { Tree } from "@lezer/common";

interface ErrorInfo {
  from?: number;
  to?: number;
  message?: string;
  start?: number;
  end?: number;
}

export const error = (tree: Tree): ErrorInfo[] => {
  const out: ErrorInfo[] = [];
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
