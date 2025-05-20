import { parser as lezerParser } from "./lezerParser.js";

const example = `VAR_J = 2;
C1;
FORK ROT_C3;
C2;
JOIN VAR_J, ROT_C4, QUIT;

ROT_C3:
  C3;
  JOIN VAR_J, ROT_C4, QUIT;

ROT_C4:
  C4;
`;

const tree = lezerParser.parse(example);

console.log(tree);
for (const c in tree.children) {
  console.log(tree.children[c]);
}
console.log(tree.toString());
