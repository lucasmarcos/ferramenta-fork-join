import { styleTags, tags } from "@lezer/highlight";

export const forkJoinHighlight = styleTags({
  Fork: tags.controlKeyword,
  Join: tags.controlKeyword,
  "Def/Label": tags.definition(tags.labelName),
  "Assign/Label": tags.definition(tags.variableName),
  "Assign/Number": tags.number,
  "Call/Label": tags.function(tags.labelName),
  "Fork/Label": tags.labelName,
  "Join/Label": tags.labelName,
  LineComment: tags.lineComment,
});
