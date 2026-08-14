import { SensorDataPacket, SignalQuality } from '../types.ts';
import { ProcessedFeature, ProcessingPipeline, FeatureQuality } from './types.ts';

export abstract class BasePipeline implements ProcessingPipeline<SensorDataPacket, ProcessedFeature> {
  public abstract readonly version: string;
  protected abstract readonly featureName: string;
  protected abstract readonly unit: string;
  protected abstract readonly targetSensor: string;

  public process(packets: SensorDataPacket[]): ProcessedFeature[] {
    // 1. Validation
    const validPackets = packets.filter(p => p.sensorType === this.targetSensor && p.synchronizedTimestamp !== undefined);
    if (validPackets.length === 0) return [];

    // Group packets by small time windows if necessary, or process as a single batch.
    // For this generic architecture, we will process the batch and yield features.
    
    // 2. Preprocessing & Artifact Handling (implemented by subclass)
    return this.extractFeatures(validPackets);
  }

  protected abstract extractFeatures(packets: SensorDataPacket[]): ProcessedFeature[];

  protected createFeature(
    value: number, 
    packet: SensorDataPacket, 
    quality: FeatureQuality, 
    extraMetadata: any = {}
  ): ProcessedFeature {
    return {
      featureName: this.featureName,
      value,
      unit: this.unit,
      timestamp: packet.synchronizedTimestamp!, // Guaranteed by validation
      sourceDeviceId: packet.deviceId,
      processingVersion: this.version,
      quality,
      metadata: {
        originalSensor: packet.sensorType,
        samplingRate: 0, // Should be passed if known, 0 is placeholder
        rawSignalQuality: packet.signalQuality,
        ...extraMetadata
      }
    };
  }

  protected evaluateQuality(rawQuality: SignalQuality, value: number, minValid: number, maxValid: number): FeatureQuality {
    if (rawQuality === 'POOR' || rawQuality === 'UNKNOWN') return 'UNRELIABLE';
    if (value < minValid || value > maxValid) return 'UNRELIABLE';
    return 'GOOD';
  }
}
