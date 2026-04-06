import type { Action } from "@codemirror/lint";
import type { Tree, TreeCursor } from "@lezer/common";
import { recursivo } from "./recursivo.js";

export interface Command {
  id?: string;
  label?: string;
  fork?: string;
  join?: string;
  forkTo?: string;
  joinOn?: string;
}

export interface IError {
  message: string;
  start: number;
  end: number;
  actions: Action[];
  severity?: string;
}

let blockMap: Map<string, any[]>;
let currentBlock: string;
let variables: Map<string, number>;
let variableDef: Map<string, { start: number; end: number; value: number }>;
let joinCalls: Map<string, number>;

let threads: Map<string, Command[]>;
let currentThread: string;

let errors: IError[];

let depth: number;
let secondRound: boolean;

const getLabelText = (doc: string, cursor: TreeCursor): string => {
  return doc.slice(cursor.from, cursor.to);
};

const mapCommand = (doc: string, cursor: TreeCursor) => {
  if (cursor.name === "Def") {
    cursor.firstChild(); // Label
    currentBlock = getLabelText(doc, cursor);
    cursor.parent();
  } else {
    if (!blockMap.has(currentBlock)) {
      blockMap.set(currentBlock, []);
    }
    // Store cursor state/positions or a simplified command object
    const cmd: any = {
      name: cursor.name,
      from: cursor.from,
      to: cursor.to,
      children: [],
    };

    // Capture necessary child info while cursor is at the command
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

    blockMap.get(currentBlock)!.push(cmd);
  }
};

const doMap = (doc: string, tree: Tree) => {
  const cursor = tree.cursor();
  if (!cursor.firstChild()) return; // Into Program

  do {
    mapCommand(doc, cursor);
  } while (cursor.nextSibling());
};

const process = (command: any) => {
  switch (command.name) {
    case "Assign": {
      const label = command.children.find((c: any) => c.name === "Label")?.text;
      const numStr = command.children.find(
        (c: any) => c.name === "Number",
      )?.text;
      if (label && numStr) {
        variables.set(label, Number.parseInt(numStr));
        variableDef.set(label, {
          start: command.from,
          end: command.to,
          value: Number.parseInt(numStr),
        });
      }
      break;
    }

    case "Call": {
      const label = command.children.find((c: any) => c.name === "Label")?.text;
      if (label) {
        if (blockMap.has(label)) {
          execute(blockMap.get(label)!);
        } else {
          threads
            .get(currentThread)!
            .push({ id: crypto.randomUUID(), label: label });
        }
      }
      break;
    }

    case "Fork": {
      const label = command.children.find((c: any) => c.name === "Label")?.text;

      if (label && blockMap.has(label)) {
        const id = crypto.randomUUID();
        threads.get(currentThread)!.push({ forkTo: id });
        threads.set(id, [{ fork: label }]);
      } else if (label) {
        errors.push({
          message: "Chamada FORK para rótulo que não existe",
          start: command.from,
          end: command.to,
          actions: [
            {
              name: "Criar",
              apply(view, from, to) {
                view.dispatch({
                  changes: {
                    from: view.state.doc.length,
                    to: view.state.doc.length,
                    insert: `\n${label}:\n  QUIT;\n`,
                  },
                });
              },
            },
          ],
        });
      }
      break;
    }

    case "Join": {
      const labels = command.children.filter((c: any) => c.name === "Label");
      const controlVar = labels[0]?.text;
      const targetLabel = labels[1]?.text;
      const quitNode = command.children.find((c: any) => c.text === "QUIT");

      if (targetLabel && blockMap.has(targetLabel)) {
        if (!secondRound) {
          if (controlVar && joinCalls.has(controlVar)) {
            const calls = joinCalls.get(controlVar)!;
            joinCalls.set(controlVar, calls + 1);
          } else if (controlVar) {
            joinCalls.set(controlVar, 1);
          }
        }

        if (controlVar) {
          threads.get(currentThread)!.push({ joinOn: controlVar });
          threads.set(controlVar, [{ join: targetLabel }]);
        }
      } else if (targetLabel) {
        errors.push({
          message: "Chamada JOIN para rótulo que não existe",
          start: command.from,
          end: command.to,
          actions: [
            {
              name: "Criar",
              apply(view, from, to) {
                view.dispatch({
                  changes: {
                    from: view.state.doc.length,
                    to: view.state.doc.length,
                    insert: `\n${targetLabel}:\n  QUIT;\n`,
                  },
                });
              },
            },
          ],
        });
      }

      if (controlVar && !variables.has(controlVar)) {
        errors.push({
          message: "Chamada JOIN usando variável de controle que não existe",
          start: command.from,
          end: command.to,
          actions: [
            {
              name: "Criar",
              apply(view, from, to) {
                view.dispatch({
                  changes: { from: 0, to: 0, insert: `${controlVar} = 1;\n` },
                });
              },
            },
          ],
        });
      }

      if (!quitNode) {
        errors.push({
          message: "A última chamada em um JOIN deve ser QUIT",
          severity: "error",
          start: command.from,
          end: command.to,
          actions: [
            {
              name: "Trocar",
              apply(view, from, to) {
                view.dispatch({ changes: { from, to, insert: "QUIT" } });
              },
            },
          ],
        });
      }

      break;
    }
  }
};

const execute = (commands: any[]) => {
  depth++;

  let quit = false;

  if (depth >= 1000) {
    errors.push({
      message: "Chamadas recursivas não são permitidas",
      start: 0,
      end: 0,
      actions: [],
    });
    return;
  }

  for (const command of commands) {
    const isQuit = command.children.some((c: any) => c.text === "QUIT");
    const isJoin = command.name === "Join";

    if (isQuit) {
      quit = true;
    } else if (isJoin) {
      quit = true;
      process(command);
    } else {
      if (quit) {
        errors.push({
          message: "Chamada de função após o QUIT",
          severity: "warning",
          start: command.from,
          end: command.to,
          actions: [
            {
              name: "Remover",
              apply(view, from, to) {
                view.dispatch({
                  changes: {
                    from,
                    to: Math.min(to + 1, view.state.doc.length),
                  },
                });
              },
            },
          ],
        });
      } else {
        process(command);
      }
    }
  }

  depth--;
};

export const treewalk = (doc: string, tree: Tree) => {
  currentBlock = "";
  blockMap = new Map();
  variables = new Map();
  variableDef = new Map();
  joinCalls = new Map();
  threads = new Map();
  currentThread = "0";
  threads.set(currentThread, []);
  errors = [];

  depth = 1;
  secondRound = false;

  doMap(doc, tree);
  recursivo(blockMap);
  execute(blockMap.get("") || []);

  threads.forEach((_k, v) => {
    if (v !== "0") {
      const t = threads.get(v)![0];

      currentThread = v;
      threads.set(currentThread, []);

      if (t) {
        if (t.fork && blockMap.has(t.fork)) {
          execute(blockMap.get(t.fork)!);
        } else if (t.join && blockMap.has(t.join)) {
          execute(blockMap.get(t.join)!);
        }
      }
    }
  });

  secondRound = true;

  for (let i = 0; i < 3; i++) {
    threads.forEach((k, v) => {
      if (k[0]?.fork && blockMap.has(k[0].fork)) {
        currentThread = v;
        threads.set(currentThread, []);
        execute(blockMap.get(k[0].fork)!);
      } else if (k[0]?.join && blockMap.has(k[0].join)) {
        currentThread = v;
        threads.set(currentThread, []);
        execute(blockMap.get(k[0].join)!);
      }
    });
  }

  for (const [variable, def] of variableDef.entries()) {
    if (!joinCalls.has(variable)) {
      errors.push({
        message: "Variável de controle é definida mas não utilizada",
        start: def.start,
        end: def.end,
        severity: "warning",
        actions: [
          {
            name: "Remover",
            apply(view, from, to) {
              view.dispatch({
                changes: { from, to: Math.min(to + 1, view.state.doc.length) },
              });
            },
          },
        ],
      });
    } else {
      const calls = joinCalls.get(variable)!;
      const t = def.value;

      if (calls !== t) {
        errors.push({
          message:
            "O valor da variável de controle não corresponde ao número de JOINs",
          start: def.start,
          end: def.end,
          actions: [
            {
              name: "Corrigir",
              apply(view, from, to) {
                // This is a bit tricky with the new structure, might need more info
                view.dispatch({
                  changes: {
                    from: def.start,
                    to: def.end,
                    insert: `${variable} = ${calls};`,
                  },
                });
              },
            },
          ],
        });
      }
    }
  }

  return { threads, errors };
};
