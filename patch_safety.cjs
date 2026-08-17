const fs = require('fs');
let code = fs.readFileSync('src/lib/safetyEngine.ts', 'utf-8');

const regexes = `    const distressPatterns = [
      /\\b(depressed)\\b/gi,
      /\\b(hopeless)\\b/gi,
      /\\b(giving up)\\b/gi,
      /\\b(overwhelmed)\\b/gi,
      /\\b(panic attack)\\b/gi,
      /\\b(anxious)\\b/gi
    ];

    const adversarialPatterns = [
      /\\b(ignore all previous instructions)\\b/gi,
      /\\b(you are now)\\b/gi,
      /\\b(bypass)\\b/gi,
      /\\b(jailbreak)\\b/gi
    ];`;
code = code.replace(/const distressPatterns = \[[\s\S]*?\];/, regexes);

const advCheck = `    // 3. Scan for Ordinary Distress (if no imminent crisis)
    if (!hasCrisis) {
      for (const pattern of distressPatterns) {
        if (pattern.test(normalized)) {
          signals.push({ type: 'DISTRESS', score: 0.8, source: 'deterministic_engine' });
          break; // One distress signal is enough
        }
      }
    }

    // 4. Scan for Adversarial / Prompt Injection
    for (const pattern of adversarialPatterns) {
      if (pattern.test(normalized)) {
        signals.push({ type: 'ADVERSARIAL', score: 1.0, source: 'deterministic_engine' });
        break;
      }
    }`;
code = code.replace(/\/\/ 3\. Scan for Ordinary Distress \(if no imminent crisis\)[\s\S]*?return signals;/, advCheck + "\n    return signals;");

const advRule = `      {
        id: "CRITICAL_IMMINENT_CRISIS",
        priority: 100,
        condition: (signals) => signals.some(s => s.type === 'IMMINENT_CRISIS' && s.score >= 0.8),
        state: 'CRITICAL',
        actions: ['BLOCK_GENERATIVE_RESPONSE', 'SHOW_CRISIS_RESOURCES', 'ESCALATE_TO_HUMAN_IF_CONFIGURED']
      },
      {
        id: "HIGH_ADVERSARIAL",
        priority: 95,
        condition: (signals) => signals.some(s => s.type === 'ADVERSARIAL'),
        state: 'HIGH',
        actions: ['BLOCK_GENERATIVE_RESPONSE']
      },`;
code = code.replace(/\{\s*id: "CRITICAL_IMMINENT_CRISIS"[\s\S]*?\},/, advRule);

fs.writeFileSync('src/lib/safetyEngine.ts', code);
