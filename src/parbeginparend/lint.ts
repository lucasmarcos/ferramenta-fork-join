import type { Diagnostic } from "@codemirror/lint";
import { getActionsForError } from "./actions.js";
import { parser } from "./parser.js";
import { checkSyntax } from "./syntax.js";
import { validateStructure } from "./validation.js";

export interface LintResult {
  diagnostics: Diagnostic[];
  hasErrors: boolean;
}

export const lintParBeginParEnd = (code: string): LintResult => {
  const diagnostics: Diagnostic[] = [];
  const tree = parser.parse(code);
  const syntaxErrors = checkSyntax(tree);

  if (syntaxErrors.length > 0) {
    for (const err of syntaxErrors) {
      diagnostics.push({
        message: err.message,
        severity: "error",
        from: err.start,
        to: err.end,
        actions: getActionsForError(err),
      });
    }

    return { diagnostics, hasErrors: true };
  }

  const issues = validateStructure(tree);
  for (const issue of issues) {
    diagnostics.push({
      message: issue.message,
      severity: issue.severity,
      from: issue.start,
      to: issue.end,
      actions: getActionsForError(issue),
    });
  }

  return { diagnostics, hasErrors: false };
};
