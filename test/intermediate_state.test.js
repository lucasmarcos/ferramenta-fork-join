import { test } from "node:test";
import assert from "node:assert";
import { parser } from "../out/forkJoinParser.js";
import { treewalk } from "../out/forkjoin/treewalk.js";
import { resolve } from "../out/forkjoin/resolve.js";

// Test intermediate data structures and internal state

test("INTERNAL: Thread structure after treewalk", () => {
  const code = `
A;
FORK B_LABEL;
C;
QUIT;

B_LABEL:
  B;
  QUIT;
`;
  
  const tree = parser.parse(code);
  const walked = treewalk(code, tree);
  
  // Verify thread map structure
  assert.ok(walked.threads instanceof Map, "threads should be a Map");
  assert.ok(walked.threads.has("0"), "Should have main thread with key '0'");
  
  // Main thread should have correct commands
  const mainThread = walked.threads.get("0");
  assert.ok(Array.isArray(mainThread), "Thread should be an array");
  assert.ok(mainThread.length >= 3, "Should have at least 3 items");
  
  // Check command structure
  const commandWithLabel = mainThread.find(cmd => cmd.label === "A");
  assert.ok(commandWithLabel, "Should find command A");
  assert.ok(commandWithLabel.id, "Command should have id");
  assert.strictEqual(typeof commandWithLabel.id, "string", "id should be string");
  
  // Check fork command structure
  const forkCommand = mainThread.find(cmd => cmd.forkTo);
  assert.ok(forkCommand, "Should have fork command");
  assert.ok(forkCommand.forkTo, "Fork should have forkTo property");
  assert.strictEqual(typeof forkCommand.forkTo, "string", "forkTo should be string");
  
  // Forked thread should exist
  assert.ok(walked.threads.has(forkCommand.forkTo), "Forked thread should exist");
});

test("INTERNAL: Command properties", () => {
  const code = `
TESTCMD;
QUIT;
`;
  
  const tree = parser.parse(code);
  const walked = treewalk(code, tree);
  const mainThread = walked.threads.get("0");
  const cmd = mainThread[0];
  
  // Verify command interface
  assert.ok("id" in cmd || "label" in cmd || "forkTo" in cmd || "joinOn" in cmd, 
    "Command should have expected properties");
  
  if (cmd.id) {
    assert.strictEqual(typeof cmd.id, "string", "id should be string");
  }
  if (cmd.label) {
    assert.strictEqual(typeof cmd.label, "string", "label should be string");
  }
});

test("INTERNAL: Error structure", () => {
  const code = `FORK ;`; // Syntax error
  
  const tree = parser.parse(code);
  const walked = treewalk(code, tree);
  
  assert.ok(Array.isArray(walked.errors), "errors should be array");
  
  // May or may not have errors depending on how parser handles it
  if (walked.errors.length > 0) {
    const error = walked.errors[0];
    assert.ok("message" in error, "Error should have message");
    assert.ok("start" in error, "Error should have start");
    assert.ok("end" in error, "Error should have end");
    assert.ok("actions" in error, "Error should have actions");
    assert.strictEqual(typeof error.message, "string", "message should be string");
    assert.strictEqual(typeof error.start, "number", "start should be number");
    assert.strictEqual(typeof error.end, "number", "end should be number");
  }
});

test("INTERNAL: JOIN creates control variable thread", () => {
  const code = `VAR_X = 1;

A;
JOIN VAR_X, TARGET, QUIT;

TARGET:
  B;
`;
  
  const tree = parser.parse(code);
  const walked = treewalk(code, tree);
  
  // Control variable thread should exist
  assert.ok(walked.threads.has("VAR_X"), "Should create thread for control variable");
  
  const varThread = walked.threads.get("VAR_X");
  assert.ok(Array.isArray(varThread), "Control variable thread should be array");
  assert.ok(varThread.length > 0, "Control variable thread should have commands");
});

test("INTERNAL: Thread IDs are UUIDs for FORK", () => {
  const code = `
A;
FORK B;
QUIT;

B:
  C;
  QUIT;
`;
  
  const tree = parser.parse(code);
  const walked = treewalk(code, tree);
  
  const mainThread = walked.threads.get("0");
  const forkCmd = mainThread.find(cmd => cmd.forkTo);
  
  // forkTo should be a UUID (36 chars with dashes)
  assert.strictEqual(forkCmd.forkTo.length, 36, "Should be UUID format");
  assert.ok(forkCmd.forkTo.includes("-"), "UUID should contain dashes");
});

test("INTERNAL: joinOn references control variable name", () => {
  const code = `CTRL_VAR = 1;

A;
JOIN CTRL_VAR, TARGET, QUIT;

TARGET:
  B;
`;
  
  const tree = parser.parse(code);
  const walked = treewalk(code, tree);
  
  const mainThread = walked.threads.get("0");
  const joinCmd = mainThread.find(cmd => cmd.joinOn);
  
  assert.ok(joinCmd, "Should have JOIN command");
  assert.strictEqual(joinCmd.joinOn, "CTRL_VAR", "joinOn should reference variable name");
});

test("INTERNAL: Multiple threads from multiple FORKs", () => {
  const code = `
A;
FORK B;
FORK C;
FORK D;
QUIT;

B: QUIT;
C: QUIT;
D: QUIT;
`;
  
  const tree = parser.parse(code);
  const walked = treewalk(code, tree);
  
  // Should have main thread + 3 forked threads
  assert.ok(walked.threads.size >= 4, "Should have at least 4 threads");
  
  const mainThread = walked.threads.get("0");
  const forkCommands = mainThread.filter(cmd => cmd.forkTo);
  
  assert.strictEqual(forkCommands.length, 3, "Should have 3 fork commands");
  
  // All fork targets should exist as threads
  for (const forkCmd of forkCommands) {
    assert.ok(walked.threads.has(forkCmd.forkTo), 
      `Thread ${forkCmd.forkTo} should exist`);
  }
});

test("INTERNAL: Resolve produces cytoscape elements", async () => {
  const code = `A; B; QUIT;`;
  
  const tree = parser.parse(code);
  const walked = treewalk(code, tree);
  const elements = resolve(walked.threads);
  
  assert.ok(Array.isArray(elements), "resolve should return array");
  
  // Should have nodes and edges
  const hasNodes = elements.some(e => e.data.id && e.data.label);
  const hasEdges = elements.some(e => e.data.source && e.data.target);
  
  assert.ok(hasNodes, "Should have node elements");
  assert.ok(hasEdges, "Should have edge elements");
  
  // Node structure
  const node = elements.find(e => e.data.label === "A");
  assert.ok(node, "Should have node A");
  assert.ok(node.data.id, "Node should have id");
  assert.strictEqual(node.data.label, "A", "Node should have label");
  
  // Edge structure
  const edge = elements.find(e => e.data.source);
  if (edge) {
    assert.ok(edge.data.source, "Edge should have source");
    assert.ok(edge.data.target, "Edge should have target");
  }
});

test("INTERNAL: Empty program produces minimal structure", () => {
  const code = ``;
  
  const tree = parser.parse(code);
  const walked = treewalk(code, tree);
  
  assert.ok(walked.threads, "Should have threads map");
  assert.ok(walked.errors, "Should have errors array");
  assert.ok(Array.isArray(walked.errors), "errors should be array");
});
