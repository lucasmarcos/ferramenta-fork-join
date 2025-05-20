import type { Node, Tree } from "web-tree-sitter";

export const error = (ast: Tree) => {
  const out: Node[] = [];

  const process = (node: Node) => {
    if (node.type === "ERROR") {
      return node;
    }
  };

  const dfs = (node: Node) => {
    const res = process(node);
    if (res) {
      out.push(res);
    }
    for (let i = 0; i < node.childCount; i++) {
      dfs(node.child(i));
    }
  };

  dfs(ast.rootNode);

  return out;
};
