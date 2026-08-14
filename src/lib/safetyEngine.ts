export type SafetyState = 'NORMAL' | 'ELEVATED' | 'HIGH' | 'CRITICAL';

export interface SafetySignal {
  type: 'KEYWORD_MATCH' | 'REGEX_MATCH' | 'LLM_CLASSIFICATION' | 'SYSTEM_FAILURE' | 'MISSING_DATA';
  score: number; // 0.0 to 1.0
  source: string;
  metadata?: any;
}

export interface SafetyDecision {
  state: SafetyState;
  ruleId: string;
  ruleVersion: string;
  actions: string[];
  trace: string;
  isSafe: boolean; // false if state is HIGH or CRITICAL
}

export interface SafetyRule {
  id: string;
  priority: number; // Higher number = higher priority
  condition: (signals: SafetySignal[]) => boolean;
  state: SafetyState;
  actions: string[];
}

export class SafetyEngine {
  private version: string;
  private rules: SafetyRule[];

  constructor(version: string = "1.0.0") {
    this.version = version;
    this.rules = this.getDefaultRules();
  }

  private getDefaultRules(): SafetyRule[] {
    return [
      {
        id: "CRITICAL_KEYWORD_MATCH",
        priority: 100,
        condition: (signals) => signals.some(s => s.type === 'KEYWORD_MATCH' && s.score >= 0.9 && s.metadata?.category === 'crisis'),
        state: 'CRITICAL',
        actions: ['block_ai', 'show_emergency_hotlines', 'log_event']
      },
      {
        id: "HIGH_SYSTEM_FAILURE",
        priority: 90,
        condition: (signals) => signals.some(s => s.type === 'SYSTEM_FAILURE'),
        state: 'HIGH',
        actions: ['block_ai', 'show_fallback_message']
      },
      {
        id: "HIGH_LLM_CONCERN",
        priority: 80,
        condition: (signals) => signals.some(s => s.type === 'LLM_CLASSIFICATION' && s.score >= 0.8 && s.metadata?.category === 'self_harm'),
        state: 'HIGH',
        actions: ['block_ai', 'show_support_resources']
      },
      {
        id: "ELEVATED_CONFLICTING_SIGNALS",
        priority: 50,
        condition: (signals) => {
           const hasHighLlm = signals.some(s => s.type === 'LLM_CLASSIFICATION' && s.score >= 0.5 && s.score < 0.8);
           const hasNoKeywords = signals.every(s => s.type !== 'KEYWORD_MATCH' || s.score < 0.5);
           return hasHighLlm && hasNoKeywords;
        },
        state: 'ELEVATED',
        actions: ['allow_ai', 'append_support_footer']
      },
      {
        id: "ELEVATED_AMBIGUOUS_INPUT",
        priority: 40,
        condition: (signals) => signals.some(s => s.type === 'MISSING_DATA' || (s.type === 'KEYWORD_MATCH' && s.score >= 0.4 && s.score < 0.9)),
        state: 'ELEVATED',
        actions: ['allow_ai', 'monitor']
      },
      {
        id: "DEFAULT_NORMAL",
        priority: 0,
        condition: () => true, // Fallback
        state: 'NORMAL',
        actions: ['allow_ai']
      }
    ];
  }

  public setRules(rules: SafetyRule[], version: string) {
    this.rules = rules;
    this.version = version;
  }

  // Basic deterministic signal extraction
  public extractSignals(input: string | undefined | null): SafetySignal[] {
    const signals: SafetySignal[] = [];

    if (input === undefined || input === null || input.trim() === '') {
      signals.push({ type: 'MISSING_DATA', score: 1.0, source: 'extractor' });
      return signals;
    }

    const normalized = input.toLowerCase();

    // Deterministic crisis keywords
    const crisisKeywords = ['suicide', 'kill myself', 'end it all', 'want to die', 'overdose'];
    for (const kw of crisisKeywords) {
      if (normalized.includes(kw)) {
        signals.push({
          type: 'KEYWORD_MATCH',
          score: 1.0,
          source: 'keyword_matcher',
          metadata: { category: 'crisis', matched: kw }
        });
      }
    }

    // Elevated concern keywords
    const elevatedKeywords = ['depressed', 'hopeless', "can't go on", 'giving up'];
    for (const kw of elevatedKeywords) {
      if (normalized.includes(kw)) {
        signals.push({
          type: 'KEYWORD_MATCH',
          score: 0.6, // Not critical, but elevated
          source: 'keyword_matcher',
          metadata: { category: 'distress', matched: kw }
        });
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
        // Safe failure during rule evaluation
        console.error(`Error evaluating rule ${rule.id}:`, err);
      }
    }

    // Ultimate fallback if no rules match (should not happen due to DEFAULT_NORMAL)
    return {
      state: 'HIGH',
      ruleId: 'FAILSAFE',
      ruleVersion: this.version,
      actions: ['block_ai', 'show_fallback_message'],
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
