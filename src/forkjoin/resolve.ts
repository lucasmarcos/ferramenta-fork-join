import type { Command } from "./treewalk.js";

interface GraphElement {
  data: {
    id?: string;
    label?: string;
    shape?: string;
    source?: string;
    target?: string;
  };
}

export const resolve = (threads: Map<string, Command[]>): GraphElement[] => {
  const elements: GraphElement[] = [];
  let latest: string | undefined;

  threads.forEach((_k, v) => {
    const thread = threads.get(v);
    latest = undefined;

    if (!thread) return;

    for (const command of thread) {
      if (command.forkTo) {
        const lead = threads.get(command.forkTo)?.[0];

        if (lead) {
          if (lead.joinOn) {
            const nextLead = threads.get(lead.joinOn)?.[0];
            if (latest && nextLead?.id) {
              elements.push({ data: { source: latest, target: nextLead.id } });
            }
          } else {
            if (latest && lead.id) {
              elements.push({ data: { source: latest, target: lead.id } });
            }
          }
        }
      } else if (command.joinOn) {
        const lead = threads.get(command.joinOn)?.[0];
        if (latest && lead?.id) {
          elements.push({ data: { source: latest, target: lead.id } });
        }
      } else if (command.label) {
        elements.push({
          data: {
            id: command.id,
            label: command.label,
            shape: command.label.length <= 2 ? "ellipse" : "round-rectangle",
          },
        });

        if (latest && command.id) {
          elements.push({ data: { source: latest, target: command.id } });
        }

        latest = command.id;
      }
    }
  });

  return elements;
};
