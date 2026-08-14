export type ConnectionState = 'DISCONNECTED' | 'PAIRING' | 'CONNECTING' | 'CONNECTED' | 'RECONNECTING' | 'ERROR';
export type SensorType = 'PPG' | 'EDA_GSR' | 'SKIN_TEMPERATURE' | 'ACCELEROMETER';
export type SignalQuality = 'UNKNOWN' | 'POOR' | 'FAIR' | 'GOOD' | 'EXCELLENT';

export interface DeviceIdentity {
  id: string; // MAC address or UUID
  name: string;
  firmwareVersion: string;
  hardwareVersion: string;
}

export interface SamplingMetadata {
  rate: number; // Hz
  resolution: number; // bits
}

export interface SensorDataPacket {
  deviceId: string;
  timestamp: number; // Raw device timestamp (often milliseconds since boot or epoch)
  synchronizedTimestamp?: number; // Application/Backend synchronized epoch timestamp
  sensorType: SensorType;
  values: number[]; // Raw sensor values
  signalQuality: SignalQuality;
  sequenceNumber: number; // Incrementing ID to detect missing packets
}

export interface DeviceError {
  code: string;
  message: string;
  timestamp: number;
  isFatal: boolean;
}

export interface TimeSyncContext {
  deviceTimeAtSync: number;
  appTimeAtSync: number;
  offset: number; // appTime - deviceTime
}
