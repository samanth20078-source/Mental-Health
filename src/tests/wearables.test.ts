import assert from 'assert';
import { SimulatedDevice } from '../lib/wearables/SimulatedDevice.ts';
import { WearableManager } from '../lib/wearables/WearableManager.ts';
import { SensorDataPacket } from '../lib/wearables/types.ts';

async function runTests() {
  console.log("Starting Wearable Architecture Tests...");

  const manager = new WearableManager();
  const simDevice = new SimulatedDevice("test-sim-001", "Test Band");
  
  // 1. Device Registration and Identity
  manager.registerDevice(simDevice);
  const info = manager.getDeviceInfo();
  assert.equal(info?.name, "Test Band");
  console.log("✓ Device registration and identity mapping");

  // 2. Connection and Time Sync
  let lastState = manager.getConnectionState();
  manager.onStateChange((state) => { lastState = state; });
  
  await manager.connect();
  assert.equal(lastState, 'CONNECTED');
  console.log("✓ Connection state mapping and BLE emulation");

  // 3. Sensor Availability and Metadata
  const ppgMeta = simDevice.getSamplingMetadata('PPG');
  assert.equal(ppgMeta?.rate, 64);
  assert.equal(ppgMeta?.resolution, 16);
  console.log("✓ Sensor availability and sampling metadata");

  // 4. Raw Data Ingestion & Timestamp Synchronization
  await manager.startSensor('PPG');
  
  // Wait a moment for some packets to generate
  await new Promise(r => setTimeout(r, 100));
  
  const pipeline = manager.getPipeline();
  const buffered = pipeline.flushBuffer();
  
  assert.ok(buffered.length > 0);
  assert.ok(buffered[0].synchronizedTimestamp !== undefined);
  assert.ok(buffered[0].synchronizedTimestamp > buffered[0].timestamp); // Offset must be applied
  assert.equal(buffered[0].sensorType, 'PPG');
  assert.ok(buffered[0].values.length > 0);
  console.log("✓ Raw data ingestion and timestamp synchronization");

  // 5. Signal Quality Metadata
  assert.ok(['POOR', 'FAIR', 'GOOD', 'EXCELLENT', 'UNKNOWN'].includes(buffered[0].signalQuality));
  console.log("✓ Signal-quality metadata propagation");

  // 6. Missing Packets Handling
  // We can manually inject a sequence jump to test pipeline detection
  const jumpPacket: SensorDataPacket = {
    deviceId: "test-sim-001",
    timestamp: 1000,
    sensorType: 'PPG',
    values: [0],
    signalQuality: 'GOOD',
    sequenceNumber: buffered[buffered.length - 1].sequenceNumber + 5 // Missing 4 packets
  };
  pipeline.ingest(jumpPacket);
  assert.ok(pipeline.getMissingPacketCount() >= 4);
  console.log("✓ Missing packets and sequence gap detection");

  // 7. Disconnect and Reconnection
  simDevice.simulateError({ code: 'DISCONNECT', message: 'Connection lost', timestamp: Date.now(), isFatal: true });
  await simDevice.disconnect(); // force the state
  
  // Wait to let reconnection logic trigger
  await new Promise(r => setTimeout(r, 1500)); 
  
  assert.ok(['RECONNECTING', 'CONNECTING', 'CONNECTED'].includes(manager.getConnectionState()));
  console.log("✓ Disconnect handling and automatic reconnection logic");

  console.log("All wearable architecture tests passed!");
  
  // Cleanup
  await manager.disconnect();
  process.exit(0);
}

runTests().catch(console.error);
