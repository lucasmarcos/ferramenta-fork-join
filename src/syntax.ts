import type { Tree } from "web-tree-sitter";

export const checkSyntax = (ast: Tree) => {
  const errors = [];

  const process = (node) => {
    if (node.isMissing && (node.type === "semi" || node.type === ":")) {
      errors.push({
        message: "Faltando ponto e vírgula",
        start: node.startIndex,
        end: node.endIndex,
        actions: [
          {
            name: "Adicionar",
            apply(view, from, to) {
              view.dispatch({
                changes: {
                  from,
                  to,
                  insert: ";",
                },
              });
            },
          },
        ],
      });
    } else if (node.isError) {
      if (node.childCount > 0) {
        for (let i = 0; i < node.childCount; i++) {
          const child = node.child(i);
          if (child.type === "label") {
            if (node.parent.type === "fork") {
              errors.push({
                message:
                  "Erro de sintaxe, as chamadas FORK devem conter apenas um rótulo",
                start: node.parent.startIndex,
                end: node.parent.endIndex,
              });
            } else if (node.parent.type === "assign") {
              errors.push({
                message: "Erro de sintaxe na definição de variável",
                start: node.parent.startIndex,
                end: node.parent.endIndex,
              });
            } else if (node.parent.type === "join") {
              errors.push({
                message:
                  "Erro de sintaxe na chamada JOIN, talvez falte um ponto e vírgula",
                start: node.parent.startIndex,
                end: node.parent.endIndex,
              });
            } else if (node.parent.type === "call") {
              errors.push({
                message:
                  "Erro de sintaxe na chamada ao rótulo, talvez falte um ponto e vírgula",
                start: node.parent.child(0).startIndex,
                end: node.parent.child(0).endIndex,
              });
            } else {
              errors.push({
                message: "Erro de sintaxe, talvez falte um ponto e vírgula",
                start: child.startIndex,
                end: child.endIndex,
                actions: [
                  {
                    name: "Adicionar",
                    apply(view, from, to) {
                      view.dispatch({
                        changes: {
                          from: to,
                          to,
                          insert: ";",
                        },
                      });
                    },
                  },
                ],
              });
            }
          } else if (child.type === "semi") {
            errors.push({
              message: "Erro de sintaxe",
              start: node.startIndex,
              end: node.endIndex,
            });
          } else if (child.type === "FORK") {
            errors.push({
              message: "Erro na chamada FORK, talvez falte o rótulo alvo",
              start: node.startIndex,
              end: node.endIndex,
            });
          } else if (child.type === "JOIN") {
            errors.push({
              message:
                "Erro na chamada JOIN, ela deve conter a variável de controle e o rótulo alvo",
              start: node.startIndex,
              end: node.endIndex,
            });
          }
        }
      } else {
        errors.push({
          message: "Erro de sintaxe",
          start: node.startIndex,
          end: node.endIndex,
        });
      }
    }

    for (let i = 0; i < node.childCount; i++) {
      process(node.child(i));
    }
  };

  process(ast.rootNode);

  return errors;
};
