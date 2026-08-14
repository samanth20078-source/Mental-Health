import { ConnectionState, DeviceIdentity, SensorType, SensorDataPacket, DeviceError, SamplingMetadata } from './types.ts';

/**
 * Interface boundary representing a generic BLE wearable device.
 * Implementations (e.g., SimulatedDevice, WebBluetoothDevice) must adhere to this contract.
 */
export interface WearableDevice {
  readonly identity: DeviceIdentity;
  readonly state: ConnectionState;
  readonly batteryLevel: number | null; // 0-100 percentage
  readonly supportedSensors: SensorType[];

  // Connection Lifecycle
  connect(): Promise<void>;
  disconnect(): Promise<void>;

  // Sensor Control
  getSamplingMetadata(sensor: SensorType): SamplingMetadata | null;
  startSampling(sensor: SensorType): Promise<void>;
  stopSampling(sensor: SensorType): Promise<void>;

  // Time Synchronization
  /**
   * Retrieves the current device time to establish a synchronization offset.
   */
  requestDeviceTime(): Promise<number>;

  // Event Subscriptions
  onData(listener: (packet: SensorDataPacket) => void): void;
  removeDataListener(listener: (packet: SensorDataPacket) => void): void;

  onStateChange(listener: (state: ConnectionState) => void): void;
  removeStateListener(listener: (state: ConnectionState) => void): void;

  onError(listener: (error: DeviceError) => void): void;
  removeErrorListener(listener: (error: DeviceError) => void): void;
}
