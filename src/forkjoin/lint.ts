import type { Action, Diagnostic } from "@codemirror/lint";
import { parser } from "../forkJoinParser.js";
import { getActionsForError } from "./actions.js";
import { checkSyntax } from "./syntax.js";
import { treewalk } from "./treewalk.js";

export interface LintResult {
  diagnostics: Diagnostic[];
  hasErrors: boolean;
}

export const lintForkJoin = (code: string): LintResult => {
  const diagnostics: Diagnostic[] = [];
  let hasErrors = false;

  const tree = parser.parse(code);
  const syntaxErrors = checkSyntax(tree);

  if (syntaxErrors.length > 0) {
    hasErrors = true;
    for (const err of syntaxErrors) {
      const actions: Action[] = [];

      if (err.type === "missing-semicolon") {
        actions.push({
          name: "Inserir",
          apply(view, from, _to) {
            view.dispatch({
              changes: { from, insert: ";" },
            });
          },
        });
      }

      diagnostics.push({
        message: err.message,
        severity: "error",
        from: err.start || 0,
        to: err.end || 0,
        actions,
      });
    }
  } else {
    const walked = treewalk(code, tree);
    hasErrors = walked.errors.length > 0;
    for (const err of walked.errors) {
      diagnostics.push({
        message: err.message,
        severity: (err.severity as "error" | "warning" | "info") || "error",
        from: err.start || 0,
        to: err.end || 0,
        actions: getActionsForError(err),
      });
    }
  }

  return { diagnostics, hasErrors };
};
