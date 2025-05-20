import type { Command } from "./treewalk.js";

export const resolve = (threads: Map<string, Command[]>) => {
  let latest: string;

  let dot = "digraph {";

  threads.forEach((k, v) => {
    const thread = threads.get(v);
    latest = undefined;

    for (const command of thread) {
      if (command.forkTo) {
        const lead = threads.get(command.forkTo)[0];

        if (lead) {
          if (lead.joinOn) {
            const nextLead = threads.get(lead.joinOn)[0];

            if (latest && nextLead && nextLead.id) {
              dot = `${dot} "${latest}" -> "${nextLead.id}";`;
            }
          } else {
            if (latest && lead.id) {
              dot = `${dot} "${latest}" -> "${lead.id}";`;
            }
          }
        }
      } else if (command.joinOn) {
        const lead = threads.get(command.joinOn)[0];
        if (latest && lead && lead.id) {
          dot = `${dot} "${latest}" -> "${lead.id}";`;
        }
      } else if (command.label) {
        if (command.label.length <= 2) {
          dot = `${dot} "${command.id}" [label="${command.label}" shape=circle width=0.5 fixedsize=shape];`;
        } else {
          dot = `${dot} "${command.id}" [label="${command.label}"];`;
        }

        if (latest && command.id) {
          dot = `${dot} "${latest}" -> "${command.id}";`;
        }

        latest = command.id;
      }
    }
  });

  dot = `${dot} }`;

  return dot;
};
