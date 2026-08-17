import { WearableDevice } from './WearableDevice.ts';
import { ConnectionState, DeviceIdentity, SensorType, SensorDataPacket, DeviceError, SamplingMetadata } from './types.ts';

export class SimulatedDevice implements WearableDevice {
  public readonly identity: DeviceIdentity;
  public state: ConnectionState = 'DISCONNECTED';
  public batteryLevel: number | null = 100;
  public readonly supportedSensors: SensorType[] = ['PPG', 'EDA_GSR', 'SKIN_TEMPERATURE', 'ACCELEROMETER'];

  private dataListeners: Set<(packet: SensorDataPacket) => void> = new Set();
  private stateListeners: Set<(state: ConnectionState) => void> = new Set();
  private errorListeners: Set<(error: DeviceError) => void> = new Set();

  private activeSensors: Set<SensorType> = new Set();
  private samplingIntervals: Map<SensorType, NodeJS.Timeout> = new Map();
  private sequenceNumbers: Map<SensorType, number> = new Map();

  // Simulate a device boot time in the past to require timestamp synchronization
  private deviceBootTimeMs = Date.now() - 1000000; 

  constructor(id: string = 'sim-device-001', name: string = 'Simulated Wellness Band') {
    // SECURITY HARDENING: Prevent simulated device in production
    if (import.meta.env && import.meta.env.PROD) {
      throw new Error("CRITICAL_SECURITY_ERROR: Simulated Wearable Device cannot be instantiated in a production environment. This prevents fake physiological data from entering clinical pipelines.");
    }
    this.identity = {
      id,
      name,
      firmwareVersion: '1.0.0-sim',
      hardwareVersion: 'v1-sim'
    };
  }

  private setState(newState: ConnectionState) {
    this.state = newState;
    this.stateListeners.forEach(listener => listener(newState));
  }

  async connect(): Promise<void> {
    this.setState('CONNECTING');
    return new Promise(resolve => {
      setTimeout(() => {
        this.setState('CONNECTED');
        resolve();
      }, 500); // Simulate connection delay
    });
  }

  async disconnect(): Promise<void> {
    this.activeSensors.forEach(sensor => this.stopSampling(sensor));
    this.setState('DISCONNECTED');
  }

  getSamplingMetadata(sensor: SensorType): SamplingMetadata | null {
    switch(sensor) {
      case 'PPG': return { rate: 64, resolution: 16 };
      case 'EDA_GSR': return { rate: 4, resolution: 12 };
      case 'SKIN_TEMPERATURE': return { rate: 1, resolution: 16 };
      case 'ACCELEROMETER': return { rate: 32, resolution: 12 };
      default: return null;
    }
  }

  async startSampling(sensor: SensorType): Promise<void> {
    if (this.state !== 'CONNECTED') throw new Error("Device not connected");
    if (this.activeSensors.has(sensor)) return;

    this.activeSensors.add(sensor);
    this.sequenceNumbers.set(sensor, 0);

    const meta = this.getSamplingMetadata(sensor);
    if (!meta) throw new Error("Unsupported sensor");

    const intervalMs = 1000 / meta.rate;

    const interval = setInterval(() => {
      // SIMULATED: missing packet occasionally (1% chance)
      const skipPacket = Math.random() < 0.01;
      let seq = this.sequenceNumbers.get(sensor) || 0;
      
      if (!skipPacket) {
        const packet: SensorDataPacket = {
          deviceId: this.identity.id,
          timestamp: Date.now() - this.deviceBootTimeMs, // Raw device time
          sensorType: sensor,
          samplingRate: meta.rate,
          isSimulated: true,
          values: this.generateMockValue(sensor),
          signalQuality: Math.random() > 0.1 ? 'GOOD' : 'FAIR',
          sequenceNumber: seq
        };
        this.dataListeners.forEach(l => l(packet));
      }
      
      this.sequenceNumbers.set(sensor, seq + 1);

    }, intervalMs);

    this.samplingIntervals.set(sensor, interval);
  }

  async stopSampling(sensor: SensorType): Promise<void> {
    this.activeSensors.delete(sensor);
    const interval = this.samplingIntervals.get(sensor);
    if (interval) {
      clearInterval(interval);
      this.samplingIntervals.delete(sensor);
    }
  }

  async requestDeviceTime(): Promise<number> {
    return Date.now() - this.deviceBootTimeMs;
  }

  private generateMockValue(sensor: SensorType): number[] {
    // SIMULATED: Generate basic noise or sine waves. NOT actual medical algorithms.
    // Do NOT claim that simulated physiological measurements are real measurements.
    const t = Date.now() / 1000;
    switch(sensor) {
      case 'PPG': return [Math.sin(t * Math.PI * 2) * 100 + 500]; // Simulated AC/DC
      case 'EDA_GSR': return [Math.random() * 2 + 5]; // Baseline micro-siemens variance
      case 'SKIN_TEMPERATURE': return [32 + Math.random() * 0.5]; // Celsius surface temp variance
      case 'ACCELEROMETER': return [Math.sin(t), Math.cos(t), Math.random() * 0.1 - 0.05];
      default: return [0];
    }
  }

  // --- Listeners ---
  onData(listener: (packet: SensorDataPacket) => void): void { this.dataListeners.add(listener); }
  removeDataListener(listener: (packet: SensorDataPacket) => void): void { this.dataListeners.delete(listener); }
  
  onStateChange(listener: (state: ConnectionState) => void): void { this.stateListeners.add(listener); }
  removeStateListener(listener: (state: ConnectionState) => void): void { this.stateListeners.delete(listener); }
  
  onError(listener: (error: DeviceError) => void): void { this.errorListeners.add(listener); }
  removeErrorListener(listener: (error: DeviceError) => void): void { this.errorListeners.delete(listener); }
  
  // Method to manually trigger errors for testing
  simulateError(error: DeviceError) {
    this.errorListeners.forEach(l => l(error));
  }
}
