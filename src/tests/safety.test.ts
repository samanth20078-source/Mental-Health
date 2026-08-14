import assert from 'assert';
import { SafetyEngine, SafetySignal } from '../lib/safetyEngine.ts';

function runTests() {
  console.log("Starting Deterministic Safety Architecture Tests...");
  
  const engine = new SafetyEngine("1.0.0");

  // 1. Normal Input
  let decision = engine.processInput("I am feeling pretty good today, just a bit tired.");
  assert.equal(decision.state, 'NORMAL');
  assert.equal(decision.ruleId, 'DEFAULT_NORMAL');
  console.log("✓ Handled normal input");

  // 2. Ambiguous Input / Elevated Concern
  decision = engine.processInput("I am feeling really hopeless about work.");
  assert.equal(decision.state, 'ELEVATED');
  assert.equal(decision.ruleId, 'ELEVATED_AMBIGUOUS_INPUT');
  console.log("✓ Handled ambiguous/elevated input");

  // 3. High Concern (LLM assistance overriding no keywords)
  const llmSignal: SafetySignal = { type: 'LLM_CLASSIFICATION', score: 0.9, source: 'llm', metadata: { category: 'self_harm' } };
  decision = engine.processInput("I have a detailed plan to hurt myself", [llmSignal]); // Text itself doesn't match basic keywords, but LLM flagged it
  assert.equal(decision.state, 'HIGH');
  assert.equal(decision.ruleId, 'HIGH_LLM_CONCERN');
  console.log("✓ Handled high concern (LLM signal)");

  // 4. Critical State (Deterministic keyword override)
  decision = engine.processInput("I want to die tonight.");
  assert.equal(decision.state, 'CRITICAL');
  assert.equal(decision.ruleId, 'CRITICAL_KEYWORD_MATCH');
  assert.ok(decision.actions.includes('block_ai'));
  console.log("✓ Handled critical state");

  // 5. False Positives (Needs a specific rule or just careful signals)
  // Let's simulate a case where LLM says it's normal, but keyword matches slightly.
  const llmSignalSafe: SafetySignal = { type: 'LLM_CLASSIFICATION', score: 0.1, source: 'llm' };
  decision = engine.processInput("I am depressed because my sports team lost.", [llmSignalSafe]);
  assert.equal(decision.state, 'ELEVATED'); // Keyword 'depressed' matches, safety rule triggers ELEVATED
  console.log("✓ Handled false positives/context appropriately");

  // 6. Conflicting signals
  const conflictingLLM: SafetySignal = { type: 'LLM_CLASSIFICATION', score: 0.7, source: 'llm' }; // High LLM
  decision = engine.processInput("Everything is great", [conflictingLLM]); // No keywords
  assert.equal(decision.state, 'ELEVATED'); 
  assert.equal(decision.ruleId, 'ELEVATED_CONFLICTING_SIGNALS');
  console.log("✓ Handled conflicting signals (LLM high, keyword low)");

  // 7. Missing Data
  decision = engine.processInput("");
  assert.equal(decision.state, 'ELEVATED');
  assert.equal(decision.ruleId, 'ELEVATED_AMBIGUOUS_INPUT');
  console.log("✓ Handled missing data");

  // 8. Malformed Data
  decision = engine.processInput(null as any);
  assert.equal(decision.state, 'ELEVATED');
  console.log("✓ Handled malformed data");

  // 9. AI Unavailable (Backend failure)
  const failureSignal: SafetySignal = { type: 'SYSTEM_FAILURE', score: 1.0, source: 'backend' };
  decision = engine.processInput("hello", [failureSignal]);
  assert.equal(decision.state, 'HIGH');
  assert.equal(decision.ruleId, 'HIGH_SYSTEM_FAILURE');
  assert.ok(!decision.isSafe);
  console.log("✓ Handled AI/Backend failure safely");

  // 10. Rule version changes
  const customEngine = new SafetyEngine("2.0.0");
  customEngine.setRules([
    {
      id: "NEW_STRICT_RULE",
      priority: 200,
      condition: () => true,
      state: 'CRITICAL',
      actions: ['halt']
    }
  ], "2.0.0");
  decision = customEngine.processInput("anything");
  assert.equal(decision.state, 'CRITICAL');
  assert.equal(decision.ruleVersion, '2.0.0');
  console.log("✓ Handled rule version changes");

  console.log("All safety architecture tests passed!");
}

runTests();
