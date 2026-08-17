const fs = require('fs');
let code = fs.readFileSync('src/tests/processing.test.ts', 'utf-8');

code = code.replace("console.log(\"All physiological processing architecture tests passed!\");", `
  // 6. Verification of Simulated Flag propagation
  const simPacket: SensorDataPacket = {
    deviceId, timestamp: baseTimestamp, synchronizedTimestamp: baseTimestamp,
    sensorType: 'PPG', samplingRate: 64, values: cleanPpgData, signalQuality: 'GOOD', sequenceNumber: 1, isSimulated: true
  };
  const simFeatures = signalProcessor.processBuffer([simPacket]);
  for (const f of simFeatures) {
    if (f.validityStatus !== 'INSUFFICIENT_DATA') {
      assert.strictEqual(f.metadata.isSimulated, true, "Simulated data must never be presented as real data");
    }
  }
  console.log("✓ Simulated data strictly flagged across pipeline (Boundary enforced)");
  
  console.log("All physiological processing architecture tests passed!");`);

fs.writeFileSync('src/tests/processing.test.ts', code);
