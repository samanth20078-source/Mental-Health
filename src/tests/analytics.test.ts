import assert from 'assert';
import { InsightGenerator } from '../lib/wearables/analytics/InsightGenerator.ts';
import { BaselineEngine } from '../lib/wearables/analytics/BaselineEngine.ts';
import { ProcessedFeature } from '../lib/wearables/processing/types.ts';

function createMockFeature(
  featureName: string, 
  value: number | null, 
  timestamp: number, 
  validity: 'VALID' | 'INVALID' = 'VALID',
  isSimulated: boolean = false
): ProcessedFeature {
  return {
    featureName,
    value,
    unit: 'BPM',
    timestamp,
    sourceDeviceId: 'device-1',
    processingVersion: '1.0.0',
    signalQuality: validity === 'VALID' ? 'GOOD' : 'UNRELIABLE',
    validityStatus: validity,
    confidence: validity === 'VALID' ? 100 : 0,
    metadata: {
      originalSensor: 'PPG',
      samplingRate: 64,
      rawSignalQuality: validity === 'VALID' ? 'GOOD' : 'POOR',
      isSimulated
    }
  };
}

function runTests() {
  console.log("Starting Baseline & Insight Scientific Hardening Tests...");
  
  const engine = new BaselineEngine();
  const generator = new InsightGenerator();
  
  const featureName = 'HEART_RATE';
  const now = Date.now();
  const oneDayMs = 24 * 60 * 60 * 1000;
  const startWindow = now - (7 * oneDayMs);
  const endWindow = now - (1 * oneDayMs);

  // 1. Insufficient Baseline (Fewer than 10 valid points)
  const insufficientHistorical: ProcessedFeature[] = [];
  for (let i = 0; i < 9; i++) {
    insufficientHistorical.push(createMockFeature(featureName, 60, startWindow + (i * 1000)));
  }
  const noBaseline = engine.calculateBaseline(insufficientHistorical, featureName, startWindow, endWindow);
  assert.equal(noBaseline, null);
  console.log("✓ Rejected insufficient baseline (requires minimum 10 samples)");

  // 2. Stable Baseline & Valid Data Enforcement
  const historicalFeatures: ProcessedFeature[] = [];
  for (let i = 0; i < 15; i++) {
    historicalFeatures.push(createMockFeature(featureName, 60 + (i % 3 - 1), startWindow + (i * 1000)));
  }
  // Add some invalid and simulated data
  historicalFeatures.push(createMockFeature(featureName, 180, startWindow + 20000, 'INVALID'));
  historicalFeatures.push(createMockFeature(featureName, 70, startWindow + 21000, 'VALID', true));
  
  const baseline = engine.calculateBaseline(historicalFeatures, featureName, startWindow, endWindow);
  
  assert.ok(baseline !== null);
  assert.equal(baseline.dataPointCount, 15); // The INVALID and simulated one should be dropped
  assert.ok(Math.abs(baseline.mean - 60) < 1);
  assert.ok(baseline.stdDev > 0);
  console.log("✓ Calculated baseline correctly, excluding invalid/simulated data");

  // 3. Stable Observation & Insufficient Recent Data
  const shortRecentFeatures: ProcessedFeature[] = [
    createMockFeature(featureName, 61, now)
  ];
  const shortDeviation = engine.calculateRecentDeviation(shortRecentFeatures, baseline);
  assert.equal(shortDeviation, null);
  console.log("✓ Rejected insufficient recent observations (minimum 3 samples)");

  // 4. Sudden Change & Cooldown/Hysteresis
  const highRecentFeatures: ProcessedFeature[] = [
    createMockFeature(featureName, 85, now),
    createMockFeature(featureName, 88, now + 1000),
    createMockFeature(featureName, 86, now + 2000),
  ];
  
  const insight = generator.generateInsight(featureName, historicalFeatures, highRecentFeatures, startWindow, endWindow);
  assert.ok(insight !== null);
  assert.ok(insight.deviationZScore > 2.0);
  
  // Verify safe language
  assert.ok(insight.insightText.includes("significantly different from your personal baseline"));
  assert.ok(!insight.insightText.includes("anxiety"));
  assert.ok(insight.limitations.some(l => l.includes("Wearable data is not diagnostic")));

  // Verify cooldown blocks immediate subsequent insight
  const insight2 = generator.generateInsight(featureName, historicalFeatures, highRecentFeatures, startWindow, endWindow);
  assert.equal(insight2, null);
  
  console.log("✓ Detected sudden change and generated cautious insight");
  console.log("✓ Enforced hysteresis/cooldown to prevent alert fatigue");
  console.log("✓ Included limitations and avoided diagnostic language");

  console.log("All baseline and insight hardening tests passed!");
}

runTests();
