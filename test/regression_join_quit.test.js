import { test } from "node:test";
import assert from "node:assert";
import { parser } from "../out/forkJoinParser.js";
import { treewalk } from "../out/forkjoin/treewalk.js";
import { resolve } from "../out/forkjoin/resolve.js";

// REGRESSION TEST: Ensure JOIN with QUIT is processed correctly
// This bug caused missing nodes in the graph when JOIN included QUIT
test("REGRESSION: JOIN with QUIT must process JOIN logic", () => {
  const code = `VAR_J = 2;

A;
FORK ROT_D;
E;

ROT_D:
  D;
  JOIN VAR_J, ROT_FIM, QUIT;

ROT_FIM:
  FIM;
`;

  const tree = parser.parse(code);
  const walked = treewalk(code, tree);
  const elements = resolve(walked.threads);
  
  // Critical: The JOIN must create a thread for the control variable
  assert.ok(walked.threads.has("VAR_J"), "JOIN must create thread for control variable");
  
  // Critical: The ROT_D thread must have joinOn property
  const rotDThread = Array.from(walked.threads.entries()).find(([_id, cmds]) => 
    cmds.some(c => c.label === "D")
  );
  assert.ok(rotDThread, "Should find ROT_D thread");
  const hasJoinOn = rotDThread[1].some(cmd => cmd.joinOn === "VAR_J");
  assert.ok(hasJoinOn, "ROT_D thread must have joinOn for VAR_J");
  
  // Critical: All nodes must appear in resolved graph
  const nodes = elements.filter(e => e.data.id && e.data.label);
  const labels = nodes.map(n => n.data.label);
  
  assert.ok(labels.includes("A"), "Must have node A");
  assert.ok(labels.includes("D"), "Must have node D");
  assert.ok(labels.includes("E"), "Must have node E");
  assert.ok(labels.includes("FIM"), "Must have node FIM (was missing in bug)");
});

test("REGRESSION: Multiple JOINs with same control variable", () => {
  const code = `VAR_BARRIER = 3;

START;
FORK T1;
FORK T2;
MAIN;
JOIN VAR_BARRIER, SYNC, QUIT;

T1:
  WORK1;
  JOIN VAR_BARRIER, SYNC, QUIT;

T2:
  WORK2;
  JOIN VAR_BARRIER, SYNC, QUIT;

SYNC:
  FINAL;
`;

  const tree = parser.parse(code);
  const walked = treewalk(code, tree);
  
  // All threads should have joinOn
  let joinCount = 0;
  walked.threads.forEach(cmds => {
    if (cmds.some(c => c.joinOn === "VAR_BARRIER")) {
      joinCount++;
    }
  });
  
  assert.strictEqual(joinCount, 3, "All 3 threads should join to VAR_BARRIER");
  
  const elements = resolve(walked.threads);
  const nodes = elements.filter(e => e.data.id && e.data.label);
  const labels = nodes.map(n => n.data.label);
  
  assert.ok(labels.includes("FINAL"), "Sync point must appear");
});

test("REGRESSION: JOIN without QUIT should still work", () => {
  const code = `VAR_J = 1;

A;
FORK T1;
B;
QUIT;

T1:
  WORK;
  JOIN VAR_J, SYNC;
  
SYNC:
  FINAL;
  QUIT;
`;

  const tree = parser.parse(code);
  const walked = treewalk(code, tree);
  
  // Should process JOIN even without QUIT in same statement
  const t1Thread = Array.from(walked.threads.entries()).find(([_id, cmds]) => 
    cmds.some(c => c.label === "WORK")
  );
  
  assert.ok(t1Thread, "Should find T1 thread");
});

test("REGRESSION: Standalone QUIT without JOIN", () => {
  const code = `
A;
B;
QUIT;
`;

  const tree = parser.parse(code);
  const walked = treewalk(code, tree);
  const elements = resolve(walked.threads);
  
  const nodes = elements.filter(e => e.data.id && e.data.label);
  assert.strictEqual(nodes.length, 2, "Should have A and B");
});
