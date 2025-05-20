import type { Action } from "@codemirror/lint";
import type { Node, Tree } from "web-tree-sitter";
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
  node: Node;
  start: number;
  end: number;
  actions: Action[];
  severity?: string;
}

let blockMap: Map<string, Node[]>;
let currentBlock: string;
let variables: Map<string, number>;
let variableDef: Map<string, Node>;
let joinCalls: Map<string, number>;

let threads: Map<string, Command[]>;
let currentThread: string;

let errors: IError[];

let depth: number;

let secondRound: boolean;

const mapCommand = (node: Node) => {
  if (node.type === "def") {
    currentBlock = node.child(0).text;
  } else {
    if (!blockMap.has(currentBlock)) {
      blockMap.set(currentBlock, []);
    }
    blockMap.get(currentBlock).push(node);
  }
};

const doMap = (root: Node) => {
  for (let i = 0; i < root.childCount; i++) {
    mapCommand(root.child(i));
  }
};

const process = (command: Node) => {
  switch (command.type) {
    case "assign":
      variables.set(
        command.child(0).text,
        Number.parseInt(command.child(2).text),
      );
      variableDef.set(command.child(0).text, command);
      break;

    case "call":
      if (blockMap.has(command.child(0).text)) {
        execute(blockMap.get(command.child(0).text));
      } else {
        threads
          .get(currentThread)
          .push({ id: crypto.randomUUID(), label: command.child(0).text });
      }
      break;

    case "fork": {
      const label = command.child(1).text;

      if (blockMap.has(label)) {
        const id = crypto.randomUUID();
        threads.get(currentThread).push({ forkTo: id });
        threads.set(id, [{ fork: label }]);
      } else {
        errors.push({
          message: "Chamada FORK para rótulo que não existe",
          node: command,
          start: command.child(1).startIndex,
          end: command.child(1).endIndex,
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

    case "join": {
      const controlVar = command.child(1).text;
      const label = command.child(3).text;
      const quit = command.child(5).text;

      if (blockMap.has(label)) {
        if (!secondRound) {
          if (joinCalls.has(controlVar)) {
            const calls = joinCalls.get(controlVar);
            joinCalls.set(controlVar, calls + 1);
          } else {
            joinCalls.set(controlVar, 1);
          }
        }

        threads.get(currentThread).push({ joinOn: controlVar });
        threads.set(controlVar, [{ join: label }]);
      } else {
        errors.push({
          message: "Chamada JOIN para rótulo que não existe",
          node: command,
          start: command.child(3).startIndex,
          end: command.child(3).endIndex,
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

      if (!variables.has(controlVar)) {
        errors.push({
          message: "Chamada JOIN usando variável de controle que não existe",
          node: command,
          start: command.child(1).startIndex,
          end: command.child(1).endIndex,
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

      if (quit !== "QUIT") {
        errors.push({
          message: "A última chamada em um JOIN deve ser QUIT",
          node: command,
          severity: "error",
          start: command.child(5).startIndex,
          end: command.child(5).endIndex,
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

const execute = (commands: Node[]) => {
  depth++;

  let quit = false;

  if (depth >= 1000) {
    errors.push({
      message: "Chamadas recursivas não são permitidas",
      node: undefined,
      start: undefined,
      end: undefined,
      actions: [],
    });
    return;
  }

  for (const command of commands) {
    if (command.childCount === 0) continue;

    if (command.child(0).text === "QUIT") {
      quit = true;
    } else if (command.child(0).text === "JOIN") {
      quit = true;
      process(command);
    } else {
      if (quit) {
        errors.push({
          message: "Chamada de função após o QUIT",
          node: command,
          severity: "warning",
          start: command.startIndex,
          end: command.endIndex,
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

export const treewalk = (tree: Tree) => {
  currentBlock = undefined;
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

  doMap(tree.rootNode);
  recursivo(blockMap);
  execute(blockMap.get(undefined));

  threads.forEach((k, v) => {
    if (v !== "0") {
      const t = threads.get(v)[0];

      currentThread = v;
      threads.set(currentThread, []);

      if (t) {
        if (t.fork) {
          execute(blockMap.get(t.fork));
        } else if (t.join) {
          execute(blockMap.get(t.join));
        }
      }
    }
  });

  secondRound = true;

  for (let i = 0; i < 3; i++) {
    threads.forEach((k, v) => {
      if (k[0]?.fork) {
        currentThread = v;
        threads.set(currentThread, []);
        execute(blockMap.get(k[0].fork));
      } else if (k[0]?.join) {
        currentThread = v;
        threads.set(currentThread, []);
        execute(blockMap.get(k[0].join));
      }
    });
  }

  for (const pair of variables) {
    const variable = pair[0];

    if (!joinCalls.has(variable)) {
      const target = variableDef.get(variable);
      errors.push({
        message: "Variável de controle é definida mas não utilizada",
        node: target,
        start: target.startIndex,
        end: target.endIndex,
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
      const calls = joinCalls.get(variable);
      const target = variableDef.get(variable);
      const t = Number.parseInt(target.child(2).text);

      if (calls !== t) {
        errors.push({
          message:
            "O valor da variável de controle não corresponde ao número de JOINs",
          node: target,
          start: target.startIndex,
          end: target.endIndex,
          actions: [
            {
              name: "Corrigir",
              apply(view, from, to) {
                view.dispatch({
                  changes: {
                    from: target.child(2).startIndex,
                    to: target.child(2).endIndex,
                    insert: calls.toString(),
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
