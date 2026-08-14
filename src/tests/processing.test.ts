import assert from 'assert';
import { signalProcessor } from '../lib/wearables/processing/Processor.ts';
import { SensorDataPacket } from '../lib/wearables/types.ts';

function runTests() {
  console.log("Starting Physiological Processing Architecture Tests...");

  const baseTimestamp = Date.now();
  const deviceId = "test-device";

  // 1. Synthetic dataset creation
  const syntheticBuffer: SensorDataPacket[] = [
    // Valid Skin Temp
    { deviceId, timestamp: baseTimestamp, synchronizedTimestamp: baseTimestamp + 10, sensorType: 'SKIN_TEMPERATURE', values: [33.2, 33.3], signalQuality: 'GOOD', sequenceNumber: 1 },
    // Artifact Skin Temp (too high)
    { deviceId, timestamp: baseTimestamp + 1000, synchronizedTimestamp: baseTimestamp + 1010, sensorType: 'SKIN_TEMPERATURE', values: [55.0], signalQuality: 'GOOD', sequenceNumber: 2 },
    
    // Valid EDA
    { deviceId, timestamp: baseTimestamp, synchronizedTimestamp: baseTimestamp + 10, sensorType: 'EDA_GSR', values: [2.5, 2.6], signalQuality: 'EXCELLENT', sequenceNumber: 3 },
    // Artifact EDA (negative value)
    { deviceId, timestamp: baseTimestamp + 1000, synchronizedTimestamp: baseTimestamp + 1010, sensorType: 'EDA_GSR', values: [-1.0], signalQuality: 'GOOD', sequenceNumber: 4 },
    
    // Valid PPG (Should yield PPG, HR, and HRV)
    { deviceId, timestamp: baseTimestamp, synchronizedTimestamp: baseTimestamp + 10, sensorType: 'PPG', values: [500, 510, 520], signalQuality: 'FAIR', sequenceNumber: 5 },
    // Poor Quality PPG
    { deviceId, timestamp: baseTimestamp + 1000, synchronizedTimestamp: baseTimestamp + 1010, sensorType: 'PPG', values: [400], signalQuality: 'POOR', sequenceNumber: 6 },
    
    // Unsynchronized packet (should be ignored by strict validation, but in this architecture, DataPipeline filters it first. Let's test missing sync time)
    { deviceId, timestamp: baseTimestamp + 2000, sensorType: 'PPG', values: [400], signalQuality: 'GOOD', sequenceNumber: 7 }
  ];

  const features = signalProcessor.processBuffer(syntheticBuffer);
  
  // 2. Routing and feature generation verification
  // We expect: 2 Temp, 2 EDA, 2 PPG, 2 HR, 2 HRV = 10 features. (The unsynchronized one is dropped)
  assert.equal(features.length, 10);
  console.log("✓ Pipeline routing and batch processing");

  // 3. Metadata Retention
  const firstFeature = features[0];
  assert.ok(firstFeature.timestamp > 0);
  assert.equal(firstFeature.sourceDeviceId, deviceId);
  assert.ok(firstFeature.processingVersion.length > 0);
  assert.ok(firstFeature.metadata.originalSensor);
  console.log("✓ Mandatory metadata retention (timestamp, device, version)");

  // 4. Artifact Handling and Feature Quality Mapping
  const tempFeatures = features.filter(f => f.featureName === 'SKIN_TEMPERATURE_MEAN');
  assert.equal(tempFeatures.length, 2);
  // First temp is ~33.25 (GOOD)
  assert.equal(tempFeatures[0].quality, 'GOOD');
  // Second temp is 55.0 (UNRELIABLE due to artifact bounds > 45)
  assert.equal(tempFeatures[1].quality, 'UNRELIABLE');
  console.log("✓ Artifact handling and out-of-bounds rejection (Temp)");

  const edaFeatures = features.filter(f => f.featureName === 'EDA_SCL');
  assert.equal(edaFeatures[0].quality, 'GOOD');
  assert.equal(edaFeatures[1].quality, 'UNRELIABLE'); // Negative EDA
  console.log("✓ Artifact handling and out-of-bounds rejection (EDA)");

  // 5. Signal Quality Propagation
  const hrFeatures = features.filter(f => f.featureName === 'HEART_RATE');
  assert.equal(hrFeatures.length, 2);
  // Packet 5 was FAIR, so if it's within bounds, it should be GOOD
  assert.equal(hrFeatures[0].quality, 'GOOD');
  // Packet 6 was POOR raw quality, so it MUST be marked UNRELIABLE
  assert.equal(hrFeatures[1].quality, 'UNRELIABLE');
  console.log("✓ Signal quality metadata propagation to features");

  // 6. Multi-pipeline derivation from single sensor (PPG -> PPG, HR, HRV)
  const ppgRaw = features.filter(f => f.featureName === 'PPG_RAW_FILTERED');
  const hrv = features.filter(f => f.featureName === 'HRV_RMSSD');
  assert.equal(ppgRaw.length, 2);
  assert.equal(hrv.length, 2);
  console.log("✓ Multi-feature extraction from single raw signal (PPG)");

  console.log("All physiological processing architecture tests passed!");
  process.exit(0);
}

runTests();
