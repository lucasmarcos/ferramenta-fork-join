export const error = (ast) => {
  const out = [];

  const process = (node) => {
    if (node.type === "ERROR") {
      return node;
    }
  };

  const dfs = (node) => {
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
