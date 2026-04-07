import type { Diagnostic } from "@codemirror/lint";
import { getActionsForError } from "./actions.js";
import { parser } from "./parser.js";
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
      diagnostics.push({
        message: err.message,
        severity: "error",
        from: err.start || 0,
        to: err.end || 0,
        actions: getActionsForError(err),
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
