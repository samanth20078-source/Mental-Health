export type SafetyState = 'NORMAL' | 'ELEVATED' | 'HIGH' | 'CRITICAL';

export type SafetyAction =
  | 'ALLOW_SUPPORTIVE_RESPONSE'
  | 'ADD_SUPPORTIVE_FOOTER'
  | 'REQUEST_CLARIFICATION'
  | 'BLOCK_GENERATIVE_RESPONSE'
  | 'SHOW_CRISIS_RESOURCES'
  | 'ESCALATE_TO_HUMAN_IF_CONFIGURED';

export interface SafetySignal {
  type: string;
  score: number;
  source: string;
  metadata?: any;
}

export interface SafetyDecision {
  state: SafetyState;
  ruleId: string;
  ruleVersion: string;
  actions: SafetyAction[];
  trace: string;
  isSafe: boolean;
}

export interface SafetyRule {
  id: string;
  priority: number;
  condition: (signals: SafetySignal[]) => boolean;
  state: SafetyState;
  actions: SafetyAction[];
}

export class SafetyEngine {
  private version: string = '2.0.0-deterministic';
  private rules: SafetyRule[] = [];

  constructor() {
    this.rules = this.getDefaultRules();
  }

  private getDefaultRules(): SafetyRule[] {
    return [
            {
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
      },
      {
        id: "HIGH_AMBIGUOUS_CRISIS",
        priority: 90,
        condition: (signals) => signals.some(s => s.type === 'AMBIGUOUS_CRISIS' || (s.type === 'HISTORICAL_CRISIS' && s.score >= 0.8)),
        state: 'HIGH',
        actions: ['BLOCK_GENERATIVE_RESPONSE', 'SHOW_CRISIS_RESOURCES']
      },
      {
        id: "HIGH_SYSTEM_FAILURE",
        priority: 85,
        condition: (signals) => signals.some(s => s.type === 'SYSTEM_FAILURE'),
        state: 'CRITICAL',
        actions: ['BLOCK_GENERATIVE_RESPONSE', 'SHOW_CRISIS_RESOURCES'] // Fail closed
      },
      {
        id: "ELEVATED_DISTRESS",
        priority: 60,
        condition: (signals) => signals.some(s => s.type === 'DISTRESS' && s.score >= 0.5),
        state: 'ELEVATED',
        actions: ['ALLOW_SUPPORTIVE_RESPONSE', 'ADD_SUPPORTIVE_FOOTER']
      },
      {
        id: "ELEVATED_LLM_ADVISORY",
        priority: 50,
        condition: (signals) => signals.some(s => s.type === 'LLM_CLASSIFICATION' && s.score >= 0.8),
        // LLM cannot trigger CRITICAL/HIGH directly. Degraded to ELEVATED.
        state: 'ELEVATED',
        actions: ['ALLOW_SUPPORTIVE_RESPONSE', 'ADD_SUPPORTIVE_FOOTER']
      },
      {
        id: "ELEVATED_MISSING_DATA",
        priority: 40,
        condition: (signals) => signals.some(s => s.type === 'MISSING_DATA'),
        state: 'ELEVATED',
        actions: ['REQUEST_CLARIFICATION']
      },
      {
        id: "DEFAULT_NORMAL",
        priority: 0,
        condition: () => true, // Fallback
        state: 'NORMAL',
        actions: ['ALLOW_SUPPORTIVE_RESPONSE']
      }
    ];
  }

  public setRules(rules: SafetyRule[], version: string) {
    this.rules = rules;
    this.version = version;
  }

  private extractContext(text: string, index: number, windowSize: number = 40): string {
    const start = Math.max(0, index - windowSize);
    const end = Math.min(text.length, index + windowSize);
    return text.substring(start, end);
  }

  public extractSignals(input: string | undefined | null): SafetySignal[] {
    const signals: SafetySignal[] = [];

    if (input === undefined || input === null || input.trim() === '') {
      signals.push({ type: 'MISSING_DATA', score: 1.0, source: 'extractor' });
      return signals;
    }

    const normalized = input.toLowerCase();

    // 1. Regex Definitions
    const crisisPatterns = [
      /\b(suicide)\b/gi,
      /\b(kill myself)\b/gi,
      /\b(end my life)\b/gi,
      /\b(want to die|wanted to die)\b/gi,
      /\b(overdose)\b/gi,
      /\b(hurt myself)\b/gi,
      /\b(end it all)\b/gi,
      /\b(can\'t go on)\b/gi
    ];

        const distressPatterns = [
      /\b(depressed)\b/gi,
      /\b(hopeless)\b/gi,
      /\b(giving up)\b/gi,
      /\b(overwhelmed)\b/gi,
      /\b(panic attack)\b/gi,
      /\b(anxious)\b/gi
    ];

    const adversarialPatterns = [
      /\b(ignore all previous instructions)\b/gi,
      /\b(you are now)\b/gi,
      /\b(bypass)\b/gi,
      /\b(jailbreak)\b/gi
    ];

    // Context Modifiers
    const historicalModifiers = /\b(used to|past|years ago|was|had a history of|when i was|thought about|tried to)\b/i;
    const negationModifiers = /\b(not|never|didn\'t|don\'t|hardly|isn\'t|wasn\'t|no longer|without)\b/i;
    const thirdPersonModifiers = /\b(friend|sister|brother|mom|dad|he|she|they|someone|book|movie|article|read)\b/i;
    const hypotheticalModifiers = /\b(if|what if|imagine|wondering about)\b/i;

    let hasCrisis = false;

    // 2. Scan for Crisis Patterns
    for (const pattern of crisisPatterns) {
      let match;
      while ((match = pattern.exec(normalized)) !== null) {
        hasCrisis = true;
        const context = this.extractContext(normalized, match.index, 50);
        
        const isHistorical = historicalModifiers.test(context);
        const isNegation = negationModifiers.test(context);
        const isThirdPerson = thirdPersonModifiers.test(context);
        const isHypothetical = hypotheticalModifiers.test(context);

        if (isNegation) {
          signals.push({ type: 'AMBIGUOUS_CRISIS', score: 0.6, source: 'deterministic_engine', metadata: { context: 'negation' }});
        } else if (isThirdPerson) {
          signals.push({ type: 'AMBIGUOUS_CRISIS', score: 0.7, source: 'deterministic_engine', metadata: { context: 'third_person' }});
        } else if (isHypothetical) {
          signals.push({ type: 'AMBIGUOUS_CRISIS', score: 0.7, source: 'deterministic_engine', metadata: { context: 'hypothetical' }});
        } else if (isHistorical) {
          signals.push({ type: 'HISTORICAL_CRISIS', score: 0.8, source: 'deterministic_engine', metadata: { context: 'historical' }});
        } else {
          signals.push({ type: 'IMMINENT_CRISIS', score: 1.0, source: 'deterministic_engine' });
        }
      }
    }

        // 3. Scan for Ordinary Distress (if no imminent crisis)
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
    }
    return signals;
  }

  public evaluate(signals: SafetySignal[]): SafetyDecision {
    // Sort rules by priority descending
    const sortedRules = [...this.rules].sort((a, b) => b.priority - a.priority);

    for (const rule of sortedRules) {
      try {
        if (rule.condition(signals)) {
          return {
            state: rule.state,
            ruleId: rule.id,
            ruleVersion: this.version,
            actions: rule.actions,
            trace: `Matched rule ${rule.id} (priority ${rule.priority})`,
            isSafe: rule.state === 'NORMAL' || rule.state === 'ELEVATED'
          };
        }
      } catch (err) {
        // Safe failure during rule evaluation -> Fail closed
        console.error(`Error evaluating rule ${rule.id}`); // Minimized log
      }
    }

    // Ultimate fallback if no rules match or everything fails
    return {
      state: 'CRITICAL',
      ruleId: 'FAILSAFE',
      ruleVersion: this.version,
      actions: ['BLOCK_GENERATIVE_RESPONSE', 'SHOW_CRISIS_RESOURCES'],
      trace: 'Fallback triggered due to no matching rules',
      isSafe: false
    };
  }

  public processInput(input: string | undefined | null, additionalSignals: SafetySignal[] = []): SafetyDecision {
    try {
      const extractedSignals = this.extractSignals(input);
      const allSignals = [...extractedSignals, ...additionalSignals];
      return this.evaluate(allSignals);
    } catch (err) {
      // Top level failsafe
      return this.evaluate([{ type: 'SYSTEM_FAILURE', score: 1.0, source: 'safety_engine' }]);
    }
  }
}

export const safetyEngine = new SafetyEngine();
