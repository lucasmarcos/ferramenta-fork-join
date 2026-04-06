import { test } from "node:test";
import assert from "node:assert";
import { parser } from "../out/forkJoinParser.js";
import { treewalk } from "../out/forkjoin/treewalk.js";
import { resolve } from "../out/forkjoin/resolve.js";
import { exemploInicialForkJoin } from "../out/forkjoin/exemplo.js";

test("exemplo.ts: exemploInicialForkJoin parses successfully", () => {
  const tree = parser.parse(exemploInicialForkJoin);
  
  assert.ok(tree, "Should parse example code");
  assert.ok(!tree.cursor().type.isError, "Should not have parse errors");
});

test("exemplo.ts: exemploInicialForkJoin walks successfully", () => {
  const tree = parser.parse(exemploInicialForkJoin);
  const walked = treewalk(exemploInicialForkJoin, tree);
  
  assert.ok(walked, "Should walk example code");
  assert.ok(walked.threads, "Should have threads");
  assert.ok(walked.errors, "Should have errors array");
  
  // Check for critical errors (warnings are ok)
  const criticalErrors = walked.errors.filter(e => e.severity === "error");
  assert.strictEqual(criticalErrors.length, 0, "Should have no critical errors");
});

test("exemplo.ts: exemploInicialForkJoin resolves to graph", () => {
  const tree = parser.parse(exemploInicialForkJoin);
  const walked = treewalk(exemploInicialForkJoin, tree);
  const elements = resolve(walked.threads);
  
  assert.ok(Array.isArray(elements), "Should resolve to elements array");
  assert.ok(elements.length > 0, "Should have graph elements");
  
  const nodes = elements.filter(e => e.data.id && e.data.label);
  const edges = elements.filter(e => e.data.source && e.data.target);
  
  assert.ok(nodes.length > 0, "Should have nodes");
  assert.ok(edges.length > 0, "Should have edges");
});

test("exemplo.ts: exemploInicialForkJoin has expected nodes", () => {
  const tree = parser.parse(exemploInicialForkJoin);
  const walked = treewalk(exemploInicialForkJoin, tree);
  const elements = resolve(walked.threads);
  
  const nodes = elements.filter(e => e.data.id && e.data.label);
  const labels = nodes.map(n => n.data.label);
  
  // Based on the example code:
  // C1;
  // FORK ROT_C3;
  // C2;
  // JOIN VAR_J, ROT_C4, QUIT;
  // ROT_C3: C3; JOIN VAR_J, ROT_C4, QUIT;
  // ROT_C4: C4;
  
  assert.ok(labels.includes("C1"), "Should have node C1");
  assert.ok(labels.includes("C2"), "Should have node C2");
  assert.ok(labels.includes("C3"), "Should have node C3");
  assert.ok(labels.includes("C4"), "Should have node C4");
  
  assert.strictEqual(labels.length, 4, "Should have exactly 4 nodes");
});

test("exemplo.ts: exemploInicialForkJoin has correct structure", () => {
  const tree = parser.parse(exemploInicialForkJoin);
  const walked = treewalk(exemploInicialForkJoin, tree);
  
  // Should have main thread
  assert.ok(walked.threads.has("0"), "Should have main thread");
  
  // Should have forked thread
  const mainThread = walked.threads.get("0");
  const hasFork = mainThread.some(cmd => cmd.forkTo);
  assert.ok(hasFork, "Should have FORK in main thread");
  
  // Should have control variable thread for synchronization
  assert.ok(walked.threads.has("VAR_J"), "Should have VAR_J thread for synchronization");
  
  // Control variable thread should reference ROT_C4
  const varJThread = walked.threads.get("VAR_J");
  assert.ok(varJThread.length > 0, "VAR_J thread should have commands");
  assert.ok(varJThread.some(cmd => cmd.label === "C4"), "Should execute ROT_C4 block");
});

test("exemplo.ts: exemploInicialForkJoin variable validation", () => {
  const tree = parser.parse(exemploInicialForkJoin);
  const walked = treewalk(exemploInicialForkJoin, tree);
  
  // VAR_J = 2 and there are 2 JOINs (main thread and ROT_C3), so should be valid
  const varErrors = walked.errors.filter(e => 
    e.message.includes("variável de controle")
  );
  
  // Should either have no errors, or only a warning about unused variable
  const criticalVarErrors = varErrors.filter(e => e.severity === "error");
  assert.strictEqual(criticalVarErrors.length, 0, "Variable count should be correct");
});

test("exemplo.ts: exemploInicialForkJoin graph connectivity", () => {
  const tree = parser.parse(exemploInicialForkJoin);
  const walked = treewalk(exemploInicialForkJoin, tree);
  const elements = resolve(walked.threads);
  
  const nodes = elements.filter(e => e.data.id && e.data.label);
  const edges = elements.filter(e => e.data.source && e.data.target);
  
  // C1 should fork to both C2 and C3
  const c1Node = nodes.find(n => n.data.label === "C1");
  assert.ok(c1Node, "Should have C1 node");
  
  const c1Edges = edges.filter(e => e.data.source === c1Node.data.id);
  assert.strictEqual(c1Edges.length, 2, "C1 should have 2 outgoing edges (fork)");
  
  // C4 should have incoming edges from both C2 and C3 (synchronization)
  const c4Node = nodes.find(n => n.data.label === "C4");
  assert.ok(c4Node, "Should have C4 node");
  
  const c4Edges = edges.filter(e => e.data.target === c4Node.data.id);
  assert.strictEqual(c4Edges.length, 2, "C4 should have 2 incoming edges (join)");
});

test("exemplo.ts: exemploInicialForkJoin contains documentation comments", () => {
  // The example includes helpful comments - verify they don't break parsing
  assert.ok(exemploInicialForkJoin.includes("//"), "Should contain comments");
  assert.ok(exemploInicialForkJoin.includes("Bem-vindo"), "Should have Portuguese documentation");
  
  const tree = parser.parse(exemploInicialForkJoin);
  const walked = treewalk(exemploInicialForkJoin, tree);
  
  // Comments shouldn't cause errors
  const commentErrors = walked.errors.filter(e => 
    e.message.toLowerCase().includes("comentário") || 
    e.message.toLowerCase().includes("comment")
  );
  
  assert.strictEqual(commentErrors.length, 0, "Comments should not cause errors");
});

test("exemplo.ts: exemploInicialForkJoin is valid educational example", () => {
  const tree = parser.parse(exemploInicialForkJoin);
  const walked = treewalk(exemploInicialForkJoin, tree);
  const elements = resolve(walked.threads);
  
  // As an educational example, it should:
  // 1. Be syntactically valid
  const parseErrors = walked.errors.filter(e => 
    e.message.includes("sintaxe") || e.message.includes("syntax")
  );
  assert.strictEqual(parseErrors.length, 0, "Should be syntactically valid");
  
  // 2. Demonstrate fork-join pattern clearly
  const nodes = elements.filter(e => e.data.id && e.data.label);
  assert.ok(nodes.length >= 3, "Should have multiple nodes to demonstrate parallelism");
  
  // 3. Have proper synchronization
  assert.ok(walked.threads.has("VAR_J"), "Should demonstrate synchronization");
  
  // 4. Be complete enough to visualize
  const edges = elements.filter(e => e.data.source && e.data.target);
  assert.ok(edges.length >= 3, "Should have enough edges for meaningful visualization");
});
