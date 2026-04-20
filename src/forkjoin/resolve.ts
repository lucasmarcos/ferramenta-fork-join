import type { ElementsDefinition } from "cytoscape";
import type { Command } from "./treewalk.js";

export const resolve = (
  threads: Map<string, Command[]>,
): ElementsDefinition => {
  const elements: ElementsDefinition = { nodes: [], edges: [] };
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
              elements.edges.push({
                data: {
                  id: `${latest}#${nextLead.id}`,
                  source: latest,
                  target: nextLead.id,
                },
              });
            }
          } else {
            if (latest && lead.id) {
              elements.edges.push({
                data: {
                  id: `${latest}#${lead.id}`,
                  source: latest,
                  target: lead.id,
                },
              });
            }
          }
        }
      } else if (command.joinOn) {
        const lead = threads.get(command.joinOn)?.[0];
        if (latest && lead?.id) {
          elements.edges.push({
            data: {
              id: `${latest}#${lead.id}`,
              source: latest,
              target: lead.id,
            },
          });
        }
      } else if (command.label) {
        elements.nodes.push({
          data: {
            id: command.id,
            label: command.label,
          },
        });

        if (latest && command.id) {
          elements.edges.push({
            data: {
              id: `${latest}#${command.id}`,
              source: latest,
              target: command.id,
            },
          });
        }

        latest = command.id;
      }
    }
  });

  return elements;
};
