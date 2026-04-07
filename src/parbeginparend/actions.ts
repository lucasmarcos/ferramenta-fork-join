import type { Action } from "@codemirror/lint";
import type { GrammarError } from "./syntax.js";
import type { ValidationIssue } from "./validation.js";

export const getActionsForError = (
  err: GrammarError | ValidationIssue,
): Action[] => {
  const actions: Action[] = [];

  switch (err.type) {
    case "missing-semicolon": {
      actions.push({
        name: "Inserir",
        apply(view, from) {
          view.dispatch({
            changes: { from, insert: ";" },
          });
        },
      });
      break;
    }

    case "empty-sequential-block":
    case "empty-parallel-block": {
      actions.push({
        name: "Remover",
        apply(view, from, to) {
          view.dispatch({
            changes: { from, to },
          });
        },
      });
      break;
    }

    case "missing-end":
    case "missing-parend": {
      if (err.insertText) {
        actions.push({
          name: "Inserir",
          apply(view) {
            view.dispatch({
              changes: {
                from: view.state.doc.length,
                to: view.state.doc.length,
                insert: err.insertText,
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
