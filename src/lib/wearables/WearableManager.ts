import { WearableDevice } from './WearableDevice.ts';
import { DataPipeline } from './DataPipeline.ts';
import { ConnectionState, SensorType, SensorDataPacket } from './types.ts';

export class WearableManager {
  private device: WearableDevice | null = null;
  private pipeline: DataPipeline = new DataPipeline();
  
  private connectionState: ConnectionState = 'DISCONNECTED';
  private stateListeners: Set<(state: ConnectionState) => void> = new Set();
  
  // Reconnection logic
  private maxReconnectAttempts = 3;
  private reconnectAttempts = 0;
  private activeSensorsOnDisconnect: Set<SensorType> = new Set();

  constructor() {}

  public registerDevice(device: WearableDevice) {
    if (this.device) {
      this.disconnect();
    }
    
    this.device = device;
    
    // Bind listeners
    this.device.onStateChange(this.handleDeviceStateChange.bind(this));
    this.device.onData(this.handleData.bind(this));
    this.device.onError((err) => {
      console.error(`Wearable Error [${err.code}]:`, err.message);
      if (err.isFatal) {
        this.handleDisconnect();
      }
    });
  }

  public async connect() {
    if (!this.device) throw new Error("No device registered");
    this.reconnectAttempts = 0;
    await this.performConnection();
  }

  private async performConnection() {
    if (!this.device) return;
    
    try {
      await this.device.connect();
      
      // Perform time synchronization upon successful connection
      const devTime = await this.device.requestDeviceTime();
      this.pipeline.synchronizeTime(devTime);
      
      // Resume previously active sensors if this is a reconnection
      for (const sensor of this.activeSensorsOnDisconnect) {
        await this.device.startSampling(sensor);
      }
      this.activeSensorsOnDisconnect.clear();
      
    } catch (err) {
      console.error("Connection failed", err);
      this.handleDisconnect();
    }
  }

  public async disconnect() {
    if (!this.device) return;
    // Don't auto-reconnect if manually disconnected
    this.reconnectAttempts = this.maxReconnectAttempts; 
    await this.device.disconnect();
  }

  public async startSensor(sensor: SensorType) {
    if (!this.device) throw new Error("No device registered");
    await this.device.startSampling(sensor);
  }

  public async stopSensor(sensor: SensorType) {
    if (!this.device) throw new Error("No device registered");
    await this.device.stopSampling(sensor);
    this.activeSensorsOnDisconnect.delete(sensor);
  }

  private handleDeviceStateChange(state: ConnectionState) {
    this.connectionState = state;
    this.stateListeners.forEach(l => l(state));

    if (state === 'DISCONNECTED' || state === 'ERROR') {
      this.handleDisconnect();
    }
  }

  private handleDisconnect() {
    if (this.reconnectAttempts < this.maxReconnectAttempts) {
      this.reconnectAttempts++;
      this.connectionState = 'RECONNECTING';
      this.stateListeners.forEach(l => l('RECONNECTING'));
      
      // Removed excessive logging for security/privacy
      setTimeout(() => this.performConnection(), 1000 * this.reconnectAttempts);
    }
  }

  private handleData(packet: SensorDataPacket) {
    // Pipe raw data through the abstraction pipeline
    this.pipeline.ingest(packet);
    
    // In a real app, we might also emit this directly to UI or flush buffer to backend.
  }

  // --- Expose State ---
  public getPipeline() { return this.pipeline; }
  public getConnectionState() { return this.connectionState; }
  public getDeviceInfo() { return this.device?.identity; }

  public onStateChange(listener: (state: ConnectionState) => void) { this.stateListeners.add(listener); }
  public removeStateListener(listener: (state: ConnectionState) => void) { this.stateListeners.delete(listener); }
}
