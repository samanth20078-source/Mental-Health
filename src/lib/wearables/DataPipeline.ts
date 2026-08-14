import { SensorDataPacket, TimeSyncContext, SensorType } from './types.ts';

export class DataPipeline {
  private syncContext: TimeSyncContext | null = null;
  private buffer: SensorDataPacket[] = [];
  private lastSequenceNumbers: Map<SensorType, number> = new Map();
  private missingPacketsCount: number = 0;

  // Sync device time with local application time
  public synchronizeTime(deviceTimeMs: number) {
    const appTimeMs = Date.now();
    this.syncContext = {
      deviceTimeAtSync: deviceTimeMs,
      appTimeAtSync: appTimeMs,
      offset: appTimeMs - deviceTimeMs
    };
  }

  public ingest(packet: SensorDataPacket): SensorDataPacket | null {
    if (!this.syncContext) {
      console.warn("DataPipeline: Ingesting data before time synchronization is established. Packet dropped.");
      return null;
    }

    // 1. Time Synchronization
    // Device provides its own raw timestamp. We map it to app/epoch time based on our offset.
    const synchronizedPacket: SensorDataPacket = {
      ...packet,
      synchronizedTimestamp: packet.timestamp + this.syncContext.offset
    };

    // 2. Missing Packet Detection
    const lastSeq = this.lastSequenceNumbers.get(packet.sensorType);
    if (lastSeq !== undefined) {
      const diff = packet.sequenceNumber - lastSeq;
      if (diff > 1) {
        // We missed some packets
        this.missingPacketsCount += (diff - 1);
        console.warn(`DataPipeline: Missed ${diff - 1} packets for sensor ${packet.sensorType}`);
      } else if (diff < 1) {
         // Out of order or duplicate (very rare in strict BLE, but possible)
         console.warn(`DataPipeline: Out of order packet detected for ${packet.sensorType}`);
      }
    }
    this.lastSequenceNumbers.set(packet.sensorType, packet.sequenceNumber);

    // 3. Buffering
    this.buffer.push(synchronizedPacket);

    return synchronizedPacket;
  }

  public flushBuffer(): SensorDataPacket[] {
    const current = [...this.buffer];
    this.buffer = [];
    return current;
  }

  public getMissingPacketCount(): number {
    return this.missingPacketsCount;
  }
}
