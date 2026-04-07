import type { Action } from "@codemirror/lint";
import type { TreewalkError } from "./treewalk.js";

export const getActionsForError = (err: TreewalkError): Action[] => {
  const actions: Action[] = [];

  switch (err.type) {
    case "fork-missing-label":
    case "join-missing-label": {
      const label = err.label;
      if (label) {
        actions.push({
          name: "Criar",
          apply(view, _from, _to) {
            view.dispatch({
              changes: {
                from: view.state.doc.length,
                to: view.state.doc.length,
                insert: `\n${label}:\n  QUIT;\n`,
              },
            });
          },
        });
      }
      break;
    }

    case "join-missing-variable": {
      const label = err.label;
      if (label) {
        actions.push({
          name: "Criar",
          apply(view, _from, _to) {
            view.dispatch({
              changes: { from: 0, to: 0, insert: `${label} = 1;\n` },
            });
          },
        });
      }
      break;
    }

    case "join-missing-quit": {
      actions.push({
        name: "Trocar",
        apply(view, from, to) {
          view.dispatch({ changes: { from, to, insert: "QUIT" } });
        },
      });
      break;
    }

    case "code-after-quit":
    case "unused-variable": {
      actions.push({
        name: "Remover",
        apply(view, from, to) {
          view.dispatch({
            changes: {
              from,
              to: Math.min(to + 1, view.state.doc.length),
            },
          });
        },
      });
      break;
    }

    case "variable-mismatch": {
      if ("variable" in err && "expected" in err) {
        actions.push({
          name: "Corrigir",
          apply(view, _from, _to) {
            view.dispatch({
              changes: {
                from: err.start,
                to: err.end,
                insert: `${err.variable} = ${err.expected};`,
              },
            });
          },
        });
      }
      break;
    }
  }

  return actions;
};
