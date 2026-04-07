import { styleTags, tags } from "@lezer/highlight";

export const parBeginParEndHighlight = styleTags({
  Begin: tags.controlKeyword,
  End: tags.controlKeyword,
  ParBegin: tags.controlKeyword,
  ParEnd: tags.controlKeyword,
  "Call/Label": tags.function(tags.labelName),
});
