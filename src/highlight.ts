import { styleTags, tags } from "@lezer/highlight";

export const forkJoinHighlight = styleTags({
  Fork: tags.controlKeyword,
  Join: tags.controlKeyword,
  "Def/Label": tags.definition(tags.labelName),
  "Assign/Label": tags.variableName,
  "Assign/Digit": tags.number,
  "Call/Label": tags.function(tags.labelName),
  "Fork/Label": tags.labelName,
  "Join/Label": tags.labelName,
});

export const parBeginParEndHighlight = styleTags({
  Begin: tags.controlKeyword,
  End: tags.controlKeyword,
  ParBegin: tags.controlKeyword,
  ParEnd: tags.controlKeyword,
  "Call/Label": tags.function(tags.labelName),
});
