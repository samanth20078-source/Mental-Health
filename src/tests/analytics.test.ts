import assert from 'assert';
import { InsightGenerator } from '../lib/wearables/analytics/InsightGenerator.ts';
import { BaselineEngine } from '../lib/wearables/analytics/BaselineEngine.ts';
import { ProcessedFeature } from '../lib/wearables/processing/types.ts';

function createMockFeature(featureName: string, value: number, timestamp: number, quality: 'GOOD' | 'UNRELIABLE' = 'GOOD'): ProcessedFeature {
  return {
    featureName,
    value,
    unit: 'BPM',
    timestamp,
    sourceDeviceId: 'device-1',
    processingVersion: '1.0.0',
    quality,
    metadata: {
      originalSensor: 'PPG',
      samplingRate: 64,
      rawSignalQuality: quality === 'GOOD' ? 'GOOD' : 'POOR'
    }
  };
}

function runTests() {
  console.log("Starting Personal Baseline and Longitudinal Analytics Tests...");

  const engine = new BaselineEngine();
  const generator = new InsightGenerator();
  
  const featureName = 'HEART_RATE';
  const now = Date.now();
  const oneDayMs = 24 * 60 * 60 * 1000;
  const startWindow = now - (7 * oneDayMs);
  const endWindow = now - (1 * oneDayMs);

  // 1. Baseline Calculation and Missing/Unreliable Data Handling
  const historicalFeatures: ProcessedFeature[] = [
    createMockFeature(featureName, 60, startWindow + 1000),
    createMockFeature(featureName, 62, startWindow + 2000),
    createMockFeature(featureName, 58, startWindow + 3000),
    // UNRELIABLE data should be ignored
    createMockFeature(featureName, 180, startWindow + 4000, 'UNRELIABLE'),
    // Out of window data should be ignored
    createMockFeature(featureName, 90, now),
  ];

  const baseline = engine.calculateBaseline(historicalFeatures, featureName, startWindow, endWindow);
  
  assert.ok(baseline !== null);
  assert.equal(baseline.dataPointCount, 3);
  assert.equal(baseline.mean, 60); // (60 + 62 + 58) / 3
  assert.ok(baseline.stdDev > 0);
  console.log("✓ Calculated baseline accurately, handling missing/unreliable data");

  // 2. Significant Deviation Detection (>2 Z-Score)
  const highRecentFeatures: ProcessedFeature[] = [
    createMockFeature(featureName, 85, now),
    createMockFeature(featureName, 88, now + 1000),
  ];
  
  const highDeviation = engine.calculateRecentDeviation(highRecentFeatures, baseline);
  assert.ok(highDeviation !== null);
  assert.ok(highDeviation.zScore > 2.0); // 86.5 vs 60 mean, stdDev is ~2
  console.log("✓ Detected significant deviation (Z-score > 2)");

  // 3. Insight Generation & Safe Language
  const insight = generator.generateInsight(featureName, historicalFeatures, highRecentFeatures, startWindow, endWindow);
  assert.ok(insight !== null);
  
  // Verify strict safe language
  assert.ok(insight.insightText.includes("pattern significantly differs from your usual baseline"));
  assert.ok(!insight.insightText.includes("anxiety"));
  assert.ok(!insight.insightText.includes("stress"));
  
  // Verify alternative explanations
  assert.ok(insight.alternativeExplanations.includes('Caffeine or food intake'));
  assert.ok(insight.alternativeExplanations.includes('Normal physiological variation'));
  
  console.log("✓ Generated cautious wellness insights with alternative explanations");

  // 4. Low Confidence due to low data volume
  const sparseRecentFeatures: ProcessedFeature[] = [
    createMockFeature(featureName, 61, now),
  ];
  const sparseInsight = generator.generateInsight(featureName, historicalFeatures, sparseRecentFeatures, startWindow, endWindow);
  assert.ok(sparseInsight !== null);
  assert.equal(sparseInsight.confidence, 'LOW');
  console.log("✓ Mapped confidence correctly based on data volume");

  console.log("All analytics architecture tests passed!");
  process.exit(0);
}

runTests();
