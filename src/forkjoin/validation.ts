export interface ValidationError {
  type: "unused-variable" | "variable-mismatch";
  message: string;
  start: number;
  end: number;
  severity: string;
  variable: string;
  expected?: number;
}

export const validateVariables = (
  variableDefs: Map<string, { start: number; end: number; value: number }>,
  joinCounts: Map<string, number>,
): ValidationError[] => {
  const errors: ValidationError[] = [];

  for (const [variable, def] of variableDefs) {
    const joinCount = joinCounts.get(variable) ?? 0;

    if (joinCount === 0) {
      errors.push({
        type: "unused-variable",
        message: "Variável de controle é definida mas não utilizada",
        start: def.start,
        end: def.end,
        severity: "warning",
        variable,
      });
    } else if (joinCount !== def.value) {
      errors.push({
        type: "variable-mismatch",
        message:
          "O valor da variável de controle não corresponde ao número de JOINs",
        start: def.start,
        end: def.end,
        severity: "error",
        variable,
        expected: joinCount,
      });
    }
  }

  return errors;
};
