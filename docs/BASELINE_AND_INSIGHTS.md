# Baseline and Insight Scientific Hardening

This document outlines the architecture and principles governing the `BaselineEngine` and `InsightGenerator` (Phase R5). The core directive is absolute scientific restraint: wearable data is used to observe physiological deviation, never to establish or suggest psychiatric or medical diagnosis.

## 1. Core Principles

- **No Medical Diagnosis**: The system is explicitly forbidden from diagnosing or suggesting conditions such as depression, anxiety, PTSD, panic disorder, or suicidal ideation based on physiological data.
- **Cautious Language**: Insights are generated using strictly objective, statistical terminology (e.g., "significantly different from your personal baseline", "trending slightly higher"). Words like "anxiety," "stress," or "panic" are strictly avoided in system-generated text.
- **Alternative Explanations**: Every generated insight automatically appends a list of confounding physical factors (e.g., caffeine, exercise, temperature, sensor contact) to prevent users from immediately jumping to a psychiatric conclusion.
- **Explicit Limitations**: All insights carry embedded limitations reminding the user that "Wearable data is not diagnostic" and "Physiological changes do not confirm psychological states."

## 2. Baseline Engine Architecture

The `BaselineEngine` establishes a personal baseline per user per feature (e.g., `HEART_RATE`). 

### Data Integrity & Constraints
- **Invalid Data Exclusion**: It aggressively drops any `ProcessedFeature` with a `validityStatus` of `INVALID` or `INSUFFICIENT_DATA`.
- **Simulation Exclusion**: By default, it ignores all simulated data (`isSimulated: true`). A specific `allowSimulated` flag must be explicitly passed (e.g., for demo/testing).
- **Minimum Data Thresholds**: 
  - A baseline requires a minimum of **10 valid historical samples**.
  - A recent deviation requires a minimum of **3 valid recent samples**.

### Mathematics
- Calculates the Mean (Central Tendency) and Sample Standard Deviation (Variability).
- Calculates the Z-Score of a recent window against the historical baseline to quantify deviation cleanly without arbitrary thresholds.

## 3. Insight Generator Architecture

The `InsightGenerator` evaluates the Z-Score calculated by the `BaselineEngine` to create `WellnessInsight` objects.

### Hysteresis / Cooldown
- To prevent alert fatigue and anxiety-inducing constant notifications, the system implements a **12-hour cooldown** (`COOLDOWN_PERIOD_MS`).
- Once a significant or moderate insight is generated for a specific feature, subsequent deviations are suppressed until the cooldown expires.

### Structure of an Insight
Every generated insight contains:
- `featureName`: The target feature (e.g., HEART_RATE).
- `insightText`: The cautiously worded statistical observation.
- `alternativeExplanations`: List of physiological/environmental confounders.
- `limitations`: Explicit medical disclaimers.
- `confidence`: 'LOW', 'MEDIUM', or 'HIGH', derived from the volume of data points in the baseline and the recent window.
- `deviationZScore`: The exact mathematical deviation for transparency.
- `baseline` and `recentMean`: The raw values comparing the observation window to history.
- `observationWindowStart` / `observationWindowEnd`: Explicit time bounding of the data.
- `algorithmVersion`: Traceability for the generation logic.
