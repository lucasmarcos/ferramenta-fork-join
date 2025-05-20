import { parser } from "../out/forkJoinParser.js";
import { exemploInicial } from "../out/exemplo.js";

const tree = parser.parse(exemploInicial);

console.log(tree.toString());

const cursor = tree.cursor();

do {
  console.log(
    cursor.name,
    cursor.from,
    cursor.to,
    exemploInicial.slice(
      cursor.from,
      cursor.to
    )
  );
} while (cursor.next());

