import type { Tree } from "@lezer/common";
import { type ValidationError, validateVariables } from "./validation.js";

export interface Command {
  id?: string;
  label?: string;
  fork?: string;
  join?: string;
  forkTo?: string;
  joinOn?: string;
}

export type ErrorType =
  | "fork-missing-label"
  | "join-missing-label"
  | "join-missing-variable"
  | "join-missing-quit"
  | "code-after-quit"
  | "recursive-call";

export interface IError {
  type: ErrorType;
  message: string;
  start: number;
  end: number;
  severity: string;
  label?: string;
}

interface ParsedCommand {
  name: string;
  from: number;
  to: number;
  children: Array<{ name: string; from: number; to: number; text: string }>;
}

interface Context {
  doc: string;
  blocks: Map<string, ParsedCommand[]>;
  variables: Map<string, number>;
  variableDefs: Map<string, { start: number; end: number; value: number }>;
  joinCounts: Map<string, number>;
  calls: Map<string, number>;
  threads: Map<string, Command[]>;
  errors: IError[];
  currentThread: string;
}

const parseBlocks = (doc: string, tree: Tree): Map<string, ParsedCommand[]> => {
  const blocks = new Map<string, ParsedCommand[]>();
  let currentBlock = "";

  const cursor = tree.cursor();
  if (!cursor.firstChild()) return blocks;

  do {
    if (cursor.name === "Def") {
      cursor.firstChild();
      currentBlock = doc.slice(cursor.from, cursor.to);
      cursor.parent();
      if (!blocks.has(currentBlock)) blocks.set(currentBlock, []);
    } else {
      if (!blocks.has(currentBlock)) blocks.set(currentBlock, []);

      const cmd: ParsedCommand = {
        name: cursor.name,
        from: cursor.from,
        to: cursor.to,
        children: [],
      };

      if (cursor.firstChild()) {
        do {
          cmd.children.push({
            name: cursor.name,
            from: cursor.from,
            to: cursor.to,
            text: doc.slice(cursor.from, cursor.to),
          });
        } while (cursor.nextSibling());
        cursor.parent();
      }

      blocks.get(currentBlock)?.push(cmd);
    }
  } while (cursor.nextSibling());

  return blocks;
};

const getLabel = (cmd: ParsedCommand, index = 0): string | undefined => {
  const labels = cmd.children.filter((c) => c.name === "Label" || c.name == "AdvancedCall");
  return labels[index]?.text;
};

const hasQuit = (cmd: ParsedCommand): boolean =>
  cmd.children.some((c) => c.text === "QUIT");

const executeBlock = (ctx: Context, blockName: string, depth = 0): void => {
  if (depth > 100) {
    ctx.errors.push({
      type: "recursive-call",
      message: "Chamadas recursivas não são permitidas",
      start: 0,
      end: 0,
      severity: "error",
    });
    return;
  }

  const commands = ctx.blocks.get(blockName) ?? [];
  let quit = false;

  for (const cmd of commands) {
    if (quit && cmd.name !== "Join" && cmd.name !== "LineComment") {
      ctx.errors.push({
        type: "code-after-quit",
        message: "Chamada de função após o QUIT",
        start: cmd.from,
        end: cmd.to,
        severity: "warning",
      });
      continue;
    }

    switch (cmd.name) {
      case "Assign": {
        const label = getLabel(cmd);
        const numStr = cmd.children.find((c) => c.name === "Number")?.text;
        if (label && numStr) {
          const value = Number.parseInt(numStr, 10);
          ctx.variables.set(label, value);
          ctx.variableDefs.set(label, {
            start: cmd.from,
            end: cmd.to,
            value,
          });
        }
        break;
      }

      case "Call": {
        const label = getLabel(cmd);
        if (!label || label === "QUIT") break;

        if (ctx.blocks.has(label)) {
          executeBlock(ctx, label, depth + 1);
        } else {
          let numberOfCalls = ctx.calls.get(label);
          if (!numberOfCalls) {
            numberOfCalls = 0;
          }
          numberOfCalls += 1;
          ctx.calls.set(label, numberOfCalls);

          ctx.threads.get(ctx.currentThread)?.push({
            id: `${label}\$${numberOfCalls}`,
            label,
          });
        }
        break;
      }

      case "Fork": {
        const label = getLabel(cmd);
        if (!label) break;

        if (ctx.blocks.has(label)) {
          ctx.threads.get(ctx.currentThread)?.push({ forkTo: label });
          ctx.threads.set(label, [{ fork: label }]);
        } else {
          ctx.errors.push({
            type: "fork-missing-label",
            message: "Chamada FORK para rótulo que não existe",
            start: cmd.from,
            end: cmd.to,
            severity: "error",
            label,
          });
        }
        break;
      }

      case "Join": {
        const controlVar = getLabel(cmd, 0);
        const targetLabel = getLabel(cmd, 1);

        if (controlVar && !ctx.variables.has(controlVar)) {
          ctx.errors.push({
            type: "join-missing-variable",
            message: "Chamada JOIN usando variável de controle que não existe",
            start: cmd.from,
            end: cmd.to,
            severity: "error",
            label: controlVar,
          });
        }

        if (!hasQuit(cmd)) {
          ctx.errors.push({
            type: "join-missing-quit",
            message: "A última chamada em um JOIN deve ser QUIT",
            start: cmd.from,
            end: cmd.to,
            severity: "error",
          });
        }

        if (targetLabel && ctx.blocks.has(targetLabel)) {
          if (controlVar) {
            ctx.joinCounts.set(
              controlVar,
              (ctx.joinCounts.get(controlVar) ?? 0) + 1,
            );
            ctx.threads.get(ctx.currentThread)?.push({ joinOn: controlVar });
            if (!ctx.threads.has(controlVar)) {
              ctx.threads.set(controlVar, [{ join: targetLabel }]);
            }
          }
        } else if (targetLabel) {
          ctx.errors.push({
            type: "join-missing-label",
            message: "Chamada JOIN para rótulo que não existe",
            start: cmd.from,
            end: cmd.to,
            severity: "error",
            label: targetLabel,
          });
        }

        quit = true;
        break;
      }
    }

    if (hasQuit(cmd)) quit = true;
  }
};

const resolvePendingThreads = (ctx: Context): void => {
  const pending = new Set<string>();

  for (const [id, cmds] of ctx.threads) {
    if (id !== "0" && cmds.length === 1 && (cmds[0].fork || cmds[0].join)) {
      pending.add(id);
    }
  }

  let iterations = 0;
  while (pending.size > 0 && iterations++ < 100) {
    for (const id of [...pending]) {
      const cmd = ctx.threads.get(id)?.[0];
      if (!cmd) {
        pending.delete(id);
        continue;
      }

      const blockName = cmd.fork || cmd.join;
      if (!blockName || !ctx.blocks.has(blockName)) {
        pending.delete(id);
        continue;
      }

      ctx.currentThread = id;
      ctx.threads.set(id, []);
      executeBlock(ctx, blockName);
      pending.delete(id);

      for (const [newId, newCmds] of ctx.threads) {
        if (newCmds.length === 1 && (newCmds[0].fork || newCmds[0].join)) {
          pending.add(newId);
        }
      }
    }
  }
};

export type TreewalkError = IError | ValidationError;

export const treewalk = (doc: string, tree: Tree) => {
  const ctx: Context = {
    doc,
    blocks: parseBlocks(doc, tree),
    variables: new Map(),
    variableDefs: new Map(),
    joinCounts: new Map(),
    calls: new Map(),
    threads: new Map([["0", []]]),
    errors: [],
    currentThread: "0",
  };

  executeBlock(ctx, "");
  resolvePendingThreads(ctx);

  const validationErrors = validateVariables(ctx.variableDefs, ctx.joinCounts);
  const errors: TreewalkError[] = [...ctx.errors, ...validationErrors];

  return { threads: ctx.threads, errors };
};
