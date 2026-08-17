# Verification and Testing Strategy (Phase R9)

## Overview
This document formalizes the testing strategy designed to verify the security, privacy, safety, and functionality of the mental health platform. Our testing methodology ensures that any code deployed to production respects the strict data lifecycle, maintains professional authorization boundaries, and guarantees clinical safety through deterministic rule enforcement.

## Test Types & Coverage

### 1. Unit Tests
- **Safety Engine (`safety.test.ts`)**: Evaluates deterministic crisis recognition. It maps text patterns across a fixed corpus (NORMAL, ELEVATED, HIGH, CRITICAL, ambiguous, historical, hypothetical, negated, adversarial).
- **Physiological Processing (`processing.test.ts`)**: Verifies raw signal filtering (PPG, EDA, Temp). Validates bounds detection, missing packet interpolation, and enforces the propagation of the `isSimulated` flag to prevent synthetic data leakage into real diagnostic models.
- **Baseline Engine & Insights (`analytics.test.ts`)**: Confirms anomaly detection logic, hysteresis to prevent alert fatigue, and strict minimum-sample thresholds.
- **Evidence Architecture (`evidence.test.ts`)**: Validates the retrieval augmented generation (RAG) constraints, source attribution, and fail-closed availability logic.
- **Authorization & Consent (`authorization.test.ts`)**: Mocks the AccessManager to test the state machine transitions (PENDING, GRANTED, REVOKED, EXPIRED). 

### 2. Integration Tests
- **API Tests (`api.test.ts`)**: Simulates the Express HTTP boundary. 
  - Validates authentication limits (invalid tokens, missing tokens).
  - Tests API endpoint schemas (malformed JSON, oversized payloads).
  - Tests rate limits independently across functional vs. sensitive APIs.
- **Privacy Lifecycle (`privacy.test.ts`)**: Fully executes `deleteUser` operations to verify deep, multi-collection cascading deletes (mood_logs, assessments) while enforcing liability retention (safety_events).

### 3. Adversarial & Security Tests
- **Prompt Injection**: Confirms the `SafetyEngine` detects adversarial input ("Ignore all previous instructions...").
- **IDOR / Privilege Escalation (`security.test.ts`)**: Validates that cross-patient access, spoofed professional IDs, and fake UIDs are fundamentally rejected by backend routing.
- **Database Rules Blueprint Tests**: Verifies `firestore.rules` assertions without requiring the live emulator by testing constraints on property boundaries, data types, and required field existence.

## Deterministic Constraints
To maintain compliance, all tests run without relying on live LLM responses. Synthetic physiological signals and predefined text payloads map to explicitly defined state outputs.

## Run Book
All tests are configured via npm scripts:
```bash
# Execute full testing suite
npm run test
```
