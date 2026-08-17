# Safety Model Architecture

## Core Principles
The generative AI model must NEVER be the final authority for a safety-critical decision. All safety blocking, interventions, escalations, and emergency resource presentations are governed strictly by the **Deterministic Safety Engine**. 

## Safety States
The application maintains four explicit safety states:
- **NORMAL**: No concerning signals detected. Generative response allowed.
- **ELEVATED**: Distress, hypothetical risk, historical risk, or ambiguous signals detected. Supportive response allowed, optionally with supportive footer.
- **HIGH**: Ambiguous crisis or third-person crisis mentioned. May trigger fallback blocking and crisis resources.
- **CRITICAL**: Imminent first-person risk or system failure. Generative response is strictly blocked, and crisis resources are presented.

## Signal Extraction & Normalization
Signals are extracted from user inputs using a combination of targeted keywords and contextual modifiers.
- **Crisis Language**: Checks for direct self-harm or suicidal intent.
- **Context Modifiers**: Extracts a 40-character window around any detected crisis language. 
  - Checks for negations ("not", "never", "didn't").
  - Checks for historical context ("used to", "years ago").
  - Checks for third-person context ("friend", "someone").
  - Checks for hypothetical context ("what if").
- **Signal Types**: Outputs structured signals like `IMMINENT_CRISIS`, `AMBIGUOUS_CRISIS`, `HISTORICAL_CRISIS`, or `DISTRESS`.

## Deterministic Policy Evaluation
A prioritized rule set evaluates the extracted signals:
1. `CRITICAL_IMMINENT_CRISIS` (Priority 100) -> CRITICAL
2. `HIGH_AMBIGUOUS_CRISIS` (Priority 90) -> HIGH
3. `HIGH_SYSTEM_FAILURE` (Priority 85) -> CRITICAL
4. `ELEVATED_DISTRESS` (Priority 60) -> ELEVATED
5. `ELEVATED_LLM_ADVISORY` (Priority 50) -> ELEVATED (Downgrades LLM critical claims)
6. `ELEVATED_MISSING_DATA` (Priority 40) -> ELEVATED
7. `DEFAULT_NORMAL` (Priority 0) -> NORMAL

## Actions
The policy engine maps states to specific actions:
- `ALLOW_SUPPORTIVE_RESPONSE`: Chat continues normally.
- `ADD_SUPPORTIVE_FOOTER`: A supportive message is appended.
- `REQUEST_CLARIFICATION`: Ask the user to rephrase if data is missing or highly ambiguous.
- `BLOCK_GENERATIVE_RESPONSE`: Immediately halts the AI generation and forces a predefined safety message.
- `SHOW_CRISIS_RESOURCES`: Provides hotline information.
- `ESCALATE_TO_HUMAN_IF_CONFIGURED`: Flags the event for professional review.

## LLM Boundary & Constraints
- The AI is instructed via System Prompt to **never diagnose** or provide **medical advice**.
- If an LLM signal (e.g., from a secondary classification model) marks an input as "CRITICAL", the deterministic engine **downgrades** this to `ELEVATED_LLM_ADVISORY`. The LLM cannot unilaterally trigger a full `CRITICAL` block; only deterministic rules can do that. 

## Fail-Safe Behavior
If the Safety Engine encounters a crash, malformed input, missing dependency, or unexpected state, it throws a `SYSTEM_FAILURE` signal. This is caught by a top-level failsafe that defaults to `CRITICAL` state, triggering `BLOCK_GENERATIVE_RESPONSE` and `SHOW_CRISIS_RESOURCES`. The system always fails closed.

## Logging Policy
To protect user privacy (PHI):
- **No full user messages are logged** during safety evaluations.
- Only the `ruleId`, `state`, and `actions` are logged securely to the audit trail.
- System failures record the exception stack trace but mask the input parameter.

## Test Coverage
The test suite (`src/tests/safety.test.ts`) actively verifies:
- Obvious crisis language
- Indirect/ambiguous crisis language
- Negation handling
- Historical statement recognition
- Third-person risk statements
- Hypothetical/educational risk queries
- Ordinary distress vs. crisis differentiation
- Missing or malformed data inputs
- System failure and fail-closed integrity
- LLM signal degradation
